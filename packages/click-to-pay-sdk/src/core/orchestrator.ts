import { NetworkAdapter } from "../adapters/interface";
import { MastercardAdapter } from "../adapters/mastercard/mastercardSdkAdapter";
import { NetworkAdapterProvider } from "../adapters/networkAdapter";
import { VisaAdapter } from "../adapters/visa/visaSdkAdapter";
import {
  C2PConfig,
  C2PContext,
  C2PHooks,
  CheckoutInput,
  CheckoutOutput,
  InitializationResult,
  LookupResult,
  MaskedCard,
  MaskedCardsUnion,
  Network,
  OnboardData,
  ProfilesByNetwork,
  RecognizeResult,
  ValidationChannelId,
} from "../types/internal";
import { validateConfig } from "../utils";
import { isMastercardCard, isVisaCard } from "../utils/cardValidator";
import { logger } from "../utils/logger";
import { ClickToPayError, isClickToPayError } from "./errors";
import { extractSrcReason, toClickToPayErrorCode } from "./srcError";

const activeInstances = new Set<Orchestrator>();

export interface OrchestratorProps {
  activeNetwork?: Network;
  encryptCardFn?: () => Promise<string>;
  init(): Promise<InitializationResult>;
  initiateValidation(channelId?: ValidationChannelId): Promise<void>;
  validateIdentity({
    code,
    saveDevice,
  }: {
    code: string;
    saveDevice?: boolean;
  }): Promise<void>;
  getCards(): Promise<MaskedCard[]>;
  getCardNetwork(cardNumber: string): Network | null;
  checkout(input: CheckoutInput): Promise<CheckoutOutput>;
  unbindAppInstance(): Promise<void>;
}

export class Orchestrator implements OrchestratorProps {
  public activeNetwork?: Network;
  public encryptCardFn?: () => Promise<string>;

  private readonly config: C2PConfig;
  private initialized = false;
  private disposed = false;
  private initPromise?: Promise<InitializationResult>;
  private saveRecognitionTokenFn?: (props: {
    network: Network;
    recognitionToken: string;
    email?: string;
    phone?: string;
  }) => Promise<void>;
  private readonly onboardFn: (props: {
    email?: string;
    phone?: string;
  }) => Promise<OnboardData>;
  private profilesByNetwork: ProfilesByNetwork[] = [];
  private onboardData?: OnboardData;
  private sharedIdToken?: string;
  private provider = new NetworkAdapterProvider();

  constructor(config: C2PConfig, hooks: C2PHooks) {
    this.config = validateConfig(config);
    this.onboardFn = hooks.onboardFn;
    this.saveRecognitionTokenFn = hooks.saveRecognitionTokenFn;

    this.provider.register(new MastercardAdapter());
    this.provider.register(new VisaAdapter());
  }

  public async init(): Promise<InitializationResult> {
    this.ensureNotDisposed();

    if (this.initialized) {
      logger.debug("Already initialized, skipping");
      return "ALREADY_INITIALIZED";
    }

    if (this.initPromise) return this.initPromise;

    this.initPromise = this.performInit().finally(() => {
      this.initPromise = undefined;
    });

    return this.initPromise;
  }

  private async performInit(): Promise<InitializationResult> {
    logger.debug("Initializing Click to Pay...");

    const onboardResult = await this.onboardFn({
      email: this.config.email,
      phone: this.config.phone,
    });
    this.onboardData = onboardResult;

    if (!onboardResult.isAvailable) {
      throw new ClickToPayError(
        "NOT_AVAILABLE",
        "Click to Pay is not available"
      );
    }

    const loadedProviders = await this.tryLoadSdk(onboardResult);

    if (loadedProviders.length === 0) {
      throw new ClickToPayError(
        "SDK_LOAD_FAILED",
        "Failed to load any network SDK. Check network availability and onboardData."
      );
    }

    const initializedProviders = await this.tryInitProvider(loadedProviders);

    if (initializedProviders.length === 0) {
      throw new ClickToPayError(
        "SDK_INIT_FAILED",
        "Failed to initialize any network SDK. Check onboardData configuration."
      );
    }

    const recognizeResult = await this.firstRecognized(initializedProviders);

    if (recognizeResult?.recognized) {
      this.activeNetwork = recognizeResult.network;
      this.sharedIdToken = recognizeResult.idTokens?.[0];
      this.markInitialized();
      return "RECOGNIZED";
    }

    const lookupResult = await this.firstConsumerPresent(initializedProviders);

    if (lookupResult?.consumerPresent) {
      this.activeNetwork = lookupResult.network;
      this.markInitialized();
      return "REQUIRES_OTP";
    }

    this.markInitialized();
    return "NOT_RECOGNIZED";
  }

  public async initiateValidation(channelId?: ValidationChannelId) {
    this.ensureNotDisposed();
    this.ensureInitialized();
    this.ensureActiveNetwork();

    await this.callAdapter(this.activeNetwork, "initiateValidation", () =>
      this.getActiveAdapter().initiateValidation(channelId)
    );
  }

  public async validateIdentity({
    code,
    saveDevice,
  }: {
    code: string;
    saveDevice?: boolean;
  }) {
    this.ensureNotDisposed();
    this.ensureInitialized();
    this.ensureActiveNetwork();

    const res = await this.callAdapter(
      this.activeNetwork,
      "validateIdentity",
      () => this.getActiveAdapter().validateIdentity({ code, saveDevice })
    );
    if (res.idToken) this.sharedIdToken = res.idToken;

    if (
      saveDevice &&
      res.recognitionToken &&
      this.saveRecognitionTokenFn &&
      this.activeNetwork
    ) {
      await this.saveRecognitionTokenFn({
        network: this.activeNetwork,
        recognitionToken: res.recognitionToken,
        email: this.config.email,
        phone: this.config.phone,
      });
    }
  }

  public getCardNetwork(cardNumber: string): Network | null {
    if (isMastercardCard(cardNumber)) return "mastercard";
    if (isVisaCard(cardNumber)) return "visa";
    return null;
  }

  public async getCards(): Promise<MaskedCard[]> {
    this.ensureNotDisposed();
    this.ensureInitialized();
    if (!this.onboardData) return [];

    const adapters = this.provider.getEnabled(this.onboardData);
    const idToken = this.sharedIdToken ? [this.sharedIdToken] : undefined;
    const cards: MaskedCard[] = [];
    this.profilesByNetwork = [];

    for (const adapter of adapters) {
      try {
        const response = await adapter.getSrcProfile(idToken);

        const profiles = (
          response as { profiles?: { maskedCards?: MaskedCardsUnion[] }[] }
        )?.profiles;
        if (!profiles?.length) continue;

        this.profilesByNetwork.push(
          Object.assign({}, response, {
            network: adapter.network,
          }) as ProfilesByNetwork
        );

        for (const profile of profiles) {
          for (const card of profile.maskedCards ?? []) {
            const digitalCardData = card.digitalCardData ?? {};
            cards.push({
              srcDigitalCardId: card.srcDigitalCardId ?? "",
              panBin: card.panBin,
              panLastFour: card.panLastFour,
              panExpirationMonth: card.panExpirationMonth,
              panExpirationYear: card.panExpirationYear,
              paymentCardType: card.paymentCardType,
              tokenBinRange: card.tokenBinRange,
              tokenLastFour: card.tokenLastFour,
              network: adapter.network,
              artUri: digitalCardData.artUri,
              status: digitalCardData.status,
              presentationName: digitalCardData.presentationName,
              descriptorName: digitalCardData.descriptorName,
              dateOfCardCreated: card.dateOfCardCreated,
              dateOfCardLastUsed: card.dateOfCardLastUsed,
            });
          }
        }
      } catch (error) {
        logger.warn(`getSrcProfile failed for ${adapter.network}`, error);
      }
    }

    return cards;
  }

  public async checkout(input: CheckoutInput) {
    this.ensureNotDisposed();
    this.ensureInitialized();

    const adapterByNetwork = this.provider.get(input.network);

    const res = await this.callAdapter(input.network, "checkout", () =>
      adapterByNetwork.checkout(input, this.getContext())
    );

    if (
      input.saveDevice &&
      res.recognitionToken &&
      this.saveRecognitionTokenFn &&
      this.activeNetwork
    ) {
      await this.saveRecognitionTokenFn({
        network: this.activeNetwork,
        recognitionToken: res.recognitionToken,
        email: this.config.email,
        phone: this.config.phone,
      });
    }

    return res;
  }

  public async unbindAppInstance() {
    this.ensureNotDisposed();
    this.ensureInitialized();
    this.ensureActiveNetwork();

    await this.callAdapter(this.activeNetwork, "unbindAppInstance", () =>
      this.getActiveAdapter().unbind({ idToken: this.sharedIdToken })
    );
  }

  public async dispose(): Promise<void> {
    if (this.disposed) return;

    if (this.initialized && this.activeNetwork) {
      try {
        await this.provider
          .get(this.activeNetwork)
          .unbind({ idToken: this.sharedIdToken });
      } catch (err) {
        logger.warn("dispose: unbind failed, continuing teardown", err);
      }
    }

    this.disposed = true;
    this.initialized = false;
    this.initPromise = undefined;
    this.activeNetwork = undefined;
    this.sharedIdToken = undefined;
    this.onboardData = undefined;
    this.profilesByNetwork = [];
    activeInstances.delete(this);
  }

  private markInitialized() {
    this.initialized = true;

    if (activeInstances.size > 0 && !activeInstances.has(this)) {
      logger.warn(
        "Multiple active ClickToPay instances detected. The underlying network " +
          "SDKs use shared browser globals, so running more than one live " +
          "instance can desync their state. Call dispose() on the previous " +
          "instance before initializing a new one."
      );
    }

    activeInstances.add(this);
  }

  private getActiveAdapter() {
    this.ensureInitialized();
    if (!this.activeNetwork)
      throw new ClickToPayError(
        "NO_ACTIVE_NETWORK",
        "No active network. Call init() first."
      );
    return this.provider.get(this.activeNetwork);
  }

  /**
   * Runs a network adapter call and normalizes any rejection into a `ClickToPayError`.
   * Mastercard/Visa SRC SDKs reject with a `reason` string (e.g. `CODE_INVALID`,
   * `ACCT_INACCESSIBLE`) shared across both networks (EMVCo SRC spec) — this maps it to a
   * stable `code` so callers can branch without inspecting network-specific error shapes.
   */
  private async callAdapter<T>(
    network: Network | undefined,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (isClickToPayError(error)) throw error;

      const networkReason = extractSrcReason(error);
      throw new ClickToPayError(
        toClickToPayErrorCode(networkReason),
        networkReason
          ? `${operation} failed: ${networkReason}`
          : `${operation} failed`,
        { cause: error, network, networkReason }
      );
    }
  }

  private async tryLoadSdk(
    onboardData: OnboardData
  ): Promise<NetworkAdapter[]> {
    const providers = this.provider.getEnabled(onboardData);

    const results = await Promise.allSettled(
      providers.map((provider) => provider.loadSdk(this.config.stage))
    );

    return providers.filter((_, i) => {
      const result = results[i];
      if (result?.status === "rejected") {
        logger.error(
          `loadSdk failed for ${providers[i]?.network}`,
          result.reason
        );
        return false;
      }
      return true;
    });
  }

  private async tryInitProvider(
    loadedProviders: NetworkAdapter[]
  ): Promise<NetworkAdapter[]> {
    if (!loadedProviders.length) return [];

    const results = await Promise.allSettled(
      loadedProviders.map((provider) =>
        provider.init(this.getContext()).then(() => provider)
      )
    );

    return results.flatMap((result, i) => {
      if (result?.status === "rejected") {
        logger.error(
          `init failed for ${loadedProviders[i]?.network}`,
          result.reason
        );
        return [];
      }
      return [result.value];
    });
  }

  private async tryRecognize(
    provider: NetworkAdapter
  ): Promise<RecognizeResult> {
    try {
      const tokens = this.getRecognitionTokensFor(provider.network);

      if (tokens.length === 0) {
        logger.debug(
          `No recognition token for ${provider.network}, skipping recognize`
        );
        return { network: provider.network, recognized: false };
      }

      const result = await provider.recognize({
        recognitionTokens: tokens,
        idToken: this.sharedIdToken,
      });

      logger.debug("Recognize completed", {
        network: provider.network,
        recognitionTokensCount: result.idTokens?.length ?? 0,
        recognized: result.recognized,
      });

      return result;
    } catch (error) {
      logger.error(`recognize failed for ${provider.network}`, error);
      return {
        network: provider.network,
        recognized: false,
      };
    }
  }

  private async tryIdentityLookup(
    provider: NetworkAdapter
  ): Promise<LookupResult> {
    try {
      const lookup = await provider.identityLookup({
        email: this.config.email,
        phone: this.config.phone,
      });

      return lookup;
    } catch (error) {
      logger.error(`identityLookup failed for ${provider.network}`, error);
      return {
        network: provider.network,
        consumerPresent: false,
      };
    }
  }

  private getContext(): C2PContext {
    if (!this.onboardData) {
      throw new ClickToPayError(
        "MISSING_ONBOARD_DATA",
        "Onboard data is missing. Call init() first."
      );
    }

    return {
      config: this.config,
      onboardData: this.onboardData,
      sharedIdToken: this.sharedIdToken,
      profilesByNetwork: this.profilesByNetwork,
      encryptCardFn: this.encryptCardFn,
    };
  }

  private getRecognitionTokensFor(network: Network): string[] {
    const token = this.onboardData?.recognitionToken?.[network];
    return token ? [token] : [];
  }

  private ensureNotDisposed() {
    if (this.disposed)
      throw new ClickToPayError(
        "DISPOSED",
        "This ClickToPay instance has been disposed. Create a new instance."
      );
  }

  private ensureInitialized() {
    if (!this.initialized)
      throw new ClickToPayError(
        "NOT_INITIALIZED",
        "ClickToPay SDK is not initialized. Call init() first."
      );
  }

  private ensureActiveNetwork() {
    if (!this.activeNetwork)
      throw new ClickToPayError(
        "NO_ACTIVE_NETWORK",
        "No active network. Call init() first."
      );
  }

  private async firstRecognized(
    providers: NetworkAdapter[]
  ): Promise<RecognizeResult | null> {
    // Providers are queried in parallel, but the winner is picked by
    // registration order (Mastercard before Visa), not by response time —
    // this keeps the result deterministic instead of racing the two SDKs.
    const results = await Promise.all(
      providers.map((provider) => this.tryRecognize(provider))
    );

    return results.find((result) => result.recognized) ?? null;
  }

  private async firstConsumerPresent(
    providers: NetworkAdapter[]
  ): Promise<LookupResult | null> {
    const results = await Promise.all(
      providers.map((provider) => this.tryIdentityLookup(provider))
    );

    return results.find((result) => result.consumerPresent) ?? null;
  }
}
