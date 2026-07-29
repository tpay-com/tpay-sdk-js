import merge from "lodash.merge";
import {
  C2PContext,
  CheckoutInput,
  CheckoutOutput,
  LookupResult,
  OnboardData,
  RecognizeResult,
  Stage,
  ValidateResult,
} from "../../types/internal";
import { logger } from "../../utils/logger";
import { BaseNetworkAdapter } from "../baseAdapter";
import { NetworkAdapter } from "../interface";
import { VISA } from "./config";
import {
  GetSrcProfileResponse,
  InitiateIdentityValidationResponse,
  VisaSdk,
} from "./types";
import { buildCheckoutRequest, loadSDK } from "./utils";

export class VisaAdapter
  extends BaseNetworkAdapter<VisaSdk>
  implements
    NetworkAdapter<GetSrcProfileResponse, CheckoutInput, CheckoutOutput>
{
  readonly network = VISA;

  isEnabled(onboardData: OnboardData): boolean {
    return !!onboardData.isAvailable && !!onboardData.visaInitObject;
  }

  protected async performLoadSdk(stage: Stage): Promise<void> {
    await loadSDK(stage);
    if (!window.vAdapters?.VisaSRCI) {
      throw new Error("Visa SDK not available on window");
    }
    this.sdk = new window.vAdapters.VisaSRCI();
  }

  async init({ onboardData, config }: C2PContext): Promise<void> {
    if (!this.isEnabled(onboardData)) return;
    const sdk = this.getSdkOrThrow();

    const initObject = onboardData.visaInitObject;
    if (!initObject) {
      throw new Error(
        "onboardData.visaInitObject is required but was not provided"
      );
    }

    const params = merge({}, initObject, {
      dpaTransactionOptions: {
        transactionAmount: {
          transactionAmount: (config.amount / 100).toFixed(2),
          transactionCurrencyCode: config.currency,
          checkoutDescription: onboardData.transactionDetails?.description,
        },
      },
    });

    await sdk.init(params);
  }

  async recognize({
    recognitionTokens,
    idToken,
  }: {
    recognitionTokens?: string[];
    idToken?: string;
  } = {}): Promise<RecognizeResult> {
    const sdk = this.getSdkOrThrow();
    const response = await sdk.isRecognized({
      recognitionTokens,
      idTokens: idToken ? [idToken] : undefined,
    });

    return {
      network: this.network,
      recognized: response.recognized,
      idTokens: response.idTokens,
    };
  }

  async identityLookup({
    email,
    phone,
  }: {
    email?: string;
    phone?: string;
  }): Promise<LookupResult> {
    const sdk = this.getSdkOrThrow();

    if (!email && !phone) {
      throw new Error(
        "Either email or phone must be provided for identity lookup."
      );
    }

    const identityValue = (email ?? phone) as string;
    const identityType = email ? "EMAIL_ADDRESS" : "MOBILE_PHONE_NUMBER";

    const { consumerPresent } = await sdk.identityLookup({
      identityValue,
      identityType,
    });

    if (!consumerPresent) {
      logger.debug("User is not present in the identity lookup");
    }

    return { network: this.network, consumerPresent };
  }

  async initiateValidation(): Promise<InitiateIdentityValidationResponse> {
    const sdk = this.getSdkOrThrow();

    // The Visa SDK does not currently support passing a channelId for initiating validation, so we ignore the input parameter.
    return await sdk.initiateIdentityValidation();
  }

  async validateIdentity({ code }: { code: string }): Promise<ValidateResult> {
    const sdk = this.getSdkOrThrow();

    const result = await sdk.completeIdentityValidation({
      validationData: code,
    });

    return result;
  }

  async getSrcProfile(idTokens?: string[]): Promise<GetSrcProfileResponse> {
    const sdk = this.getSdkOrThrow();

    return await sdk.getSrcProfile({
      idTokens: idTokens ?? [],
    });
  }

  async checkout(
    input: CheckoutInput,
    context: C2PContext
  ): Promise<CheckoutOutput> {
    const sdk = this.getSdkOrThrow();

    const checkoutRequest = await buildCheckoutRequest(input, context);

    return await sdk.checkout(checkoutRequest);
  }

  async unbind({ idToken }: { idToken?: string }): Promise<void> {
    const sdk = this.getSdkOrThrow();

    await sdk.unbindAppInstance({
      idToken,
    });
  }
}
