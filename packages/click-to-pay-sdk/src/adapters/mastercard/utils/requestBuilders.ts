import merge from "lodash.merge";
import { C2PConfig, OnboardData } from "../../../types/internal";
import {
  getMastercardPrivacyPolicyLink,
  getMastercardTermsLink,
  MASTERCARD_SDK_TRANSACTION_OPTIONS,
} from "../config";
import { CheckoutRequest, ComplianceSettings } from "../types";

export function createValidationComplianceSettings(
  saveDevice?: boolean
): ComplianceSettings | undefined {
  if (!saveDevice) return undefined;

  return {
    complianceResources: [
      {
        complianceType: "REMEMBER_ME",
        uri: getMastercardPrivacyPolicyLink(),
        version: "LATEST",
      },
    ],
  };
}

export function createCheckoutComplianceSettings(
  saveDevice?: boolean
): ComplianceSettings {
  return {
    complianceResources: [
      ...(saveDevice
        ? [
            {
              complianceType: "REMEMBER_ME" as const,
              uri: getMastercardPrivacyPolicyLink(),
              version: "LATEST",
            },
          ]
        : []),
      {
        complianceType: "TERMS_AND_CONDITIONS",
        uri: getMastercardTermsLink(),
        version: "LATEST",
      },
      {
        complianceType: "PRIVACY_POLICY",
        uri: getMastercardPrivacyPolicyLink(),
        version: "LATEST",
      },
    ],
  };
}

export function buildCheckoutRequest({
  idToken,
  config,
  onboardData,
  srcDigitalCardId,
  saveDevice,
  windowRef,
  encryptedCard,
}: {
  idToken?: string;
  config: C2PConfig;
  onboardData: OnboardData;
  srcDigitalCardId?: string;
  saveDevice?: boolean;
  windowRef?: Window | null;
  encryptedCard?: string;
}): CheckoutRequest {
  const dpaBase = onboardData.mastercardInitObject?.dpaTransactionOptions ?? {};

  const commonDpaOptions = merge(
    {},
    dpaBase,
    MASTERCARD_SDK_TRANSACTION_OPTIONS,
    {
      dpaLocale: config.locale,
      transactionAmount: {
        transactionAmount: Number((config.amount / 100).toFixed(2)),
        transactionCurrencyCode: config.currency,
      },
    }
  );

  const checkoutRequest: CheckoutRequest = {
    idToken,
    dpaTransactionOptions: commonDpaOptions,
    payloadTypeIndicatorCheckout: "FULL",
    complianceSettings: createCheckoutComplianceSettings(saveDevice),
    windowRef,
  };

  if (encryptedCard) {
    checkoutRequest.encryptedCard = encryptedCard;
  } else if (srcDigitalCardId) {
    checkoutRequest.srcDigitalCardId = srcDigitalCardId;
  } else {
    throw new Error(
      "Either encryptedCard or srcDigitalCardId must be provided for checkout."
    );
  }

  return checkoutRequest;
}
