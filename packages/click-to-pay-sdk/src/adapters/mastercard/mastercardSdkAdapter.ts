import merge from "lodash.merge";
import {
  C2PContext,
  CheckoutInput,
  CheckoutOutput,
  LookupResult,
  MastercardInitObject,
  OnboardData,
  RecognizeResult,
  Stage,
  ValidateResult,
  ValidationChannelId,
} from "../../types/internal";
import { logger } from "../../utils/logger";
import { BaseNetworkAdapter } from "../baseAdapter";
import { NetworkAdapter } from "../interface";
import { MASTERCARD, MASTERCARD_INIT_SDK_TRANSACTION_OPTIONS } from "./config";
import {
  GetSrcProfileResponse,
  InitiateIdentityValidationResponse,
  MastercardSdk,
} from "./types";
import {
  buildCheckoutRequest,
  createValidationComplianceSettings,
  loadSDK,
} from "./utils";

export class MastercardAdapter
  extends BaseNetworkAdapter<MastercardSdk>
  implements
    NetworkAdapter<GetSrcProfileResponse, CheckoutInput, CheckoutOutput>
{
  readonly network = MASTERCARD;

  isEnabled(onboardData: OnboardData): boolean {
    return !!onboardData.isAvailable && !!onboardData.mastercardInitObject;
  }

  protected async performLoadSdk(stage: Stage): Promise<void> {
    try {
      await loadSDK(stage);
      if (!window.SRCSDK_MASTERCARD) {
        throw new Error("Mastercard SDK not available on window");
      }
      this.sdk = window.SRCSDK_MASTERCARD;
    } catch (error) {
      logger.error("Failed to load Mastercard SDK", error);
      throw error;
    }
  }

  async init({ onboardData }: C2PContext): Promise<void> {
    if (!this.isEnabled(onboardData)) return;
    const sdk = this.getSdkOrThrow();

    const initObject = onboardData.mastercardInitObject;
    if (!initObject) {
      throw new Error(
        "onboardData.mastercardInitObject is required but was not provided"
      );
    }

    const params: MastercardInitObject = merge({}, initObject, {
      dpaTransactionOptions: MASTERCARD_INIT_SDK_TRANSACTION_OPTIONS,
    });

    await sdk.init(params);
  }

  async recognize({
    recognitionTokens,
  }: {
    recognitionTokens?: string[];
  }): Promise<RecognizeResult> {
    const sdk = this.getSdkOrThrow();

    const response = await sdk.isRecognized({
      recognitionTokens: recognitionTokens ?? [],
    });

    return {
      network: this.network,
      recognized: response.recognized,
      idTokens: response.idTokens ?? [],
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
      consumerIdentity: {
        identityValue,
        identityType,
      },
    });

    if (!consumerPresent) {
      logger.debug("User is not present in the identity lookup");
    }

    return { network: this.network, consumerPresent };
  }

  async initiateValidation(
    channelId?: ValidationChannelId
  ): Promise<InitiateIdentityValidationResponse> {
    const sdk = this.getSdkOrThrow();

    return await sdk.initiateIdentityValidation({
      requestedValidationChannelId: channelId,
    });
  }

  async validateIdentity({
    code,
    saveDevice,
  }: {
    code: string;
    saveDevice?: boolean;
  }): Promise<ValidateResult> {
    const sdk = this.getSdkOrThrow();

    return await sdk.completeIdentityValidation({
      validationData: code,
      complianceSettings: createValidationComplianceSettings(saveDevice),
    });
  }

  async getSrcProfile(idTokens?: string[]): Promise<GetSrcProfileResponse> {
    const sdk = this.getSdkOrThrow();

    return await sdk.getSrcProfile({
      idTokens: idTokens ?? undefined,
    });
  }

  async checkout(
    { saveDevice, srcDigitalCardId, windowRef, consumer }: CheckoutInput,
    { encryptCardFn, sharedIdToken, onboardData, config }: C2PContext
  ) {
    const sdk = this.getSdkOrThrow();

    let encryptedCardData: string | undefined;

    if (encryptCardFn && !srcDigitalCardId) {
      try {
        encryptedCardData = await encryptCardFn();
      } catch (err) {
        throw new Error(
          `Card encryption failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    if (encryptedCardData) {
      try {
        await sdk.enrollCard({
          encryptedCard: encryptedCardData,
          idToken: sharedIdToken,
        });
      } catch (err) {
        throw new Error(`Failed to enroll card`, {
          cause: err,
        });
      }
    }

    const checkoutRequest = buildCheckoutRequest({
      idToken: sharedIdToken,
      encryptedCard: encryptedCardData,
      onboardData,
      config,
      srcDigitalCardId,
      windowRef,
      saveDevice,
      consumer,
    });

    return await sdk.checkout(checkoutRequest);
  }

  async unbind({
    idToken,
    recognitionToken,
  }: {
    idToken?: string;
    recognitionToken?: string;
  }): Promise<void> {
    const sdk = this.getSdkOrThrow();

    await sdk.unbindAppInstance({
      idToken,
      recognitionToken,
    });
  }
}
