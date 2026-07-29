import merge from "lodash.merge";
import { C2PContext, CheckoutInput } from "../../../types/internal";
import { logger } from "../../../utils/logger";
import { getVisaPrivacyPolicyLink, getVisaTermsLink } from "../config";
import {
  ComplianceSettings,
  CheckoutInput as VisaCheckoutInput,
} from "../types";

export async function buildCheckoutRequest(
  { saveDevice, windowRef, consumer, srcDigitalCardId }: CheckoutInput,
  {
    onboardData,
    config,
    encryptCardFn,
    sharedIdToken,
    profilesByNetwork,
  }: C2PContext
): Promise<VisaCheckoutInput> {
  if (!onboardData.visaInitObject) {
    throw new Error(
      "onboardData.visaInitObject is required but was not provided"
    );
  }

  const initObj = onboardData.visaInitObject;
  const visaProfiles = profilesByNetwork?.find((p) => p.network === "visa");

  const request: VisaCheckoutInput = merge(
    {},
    {
      dpaTransactionOptions: {
        ...initObj.dpaTransactionOptions,
        transactionAmount: {
          transactionAmount: (config.amount / 100).toFixed(2),
          transactionCurrencyCode: config.currency,
        },
      },
    },
    {
      srciDpaId: initObj.srciDpaId ?? "",
      srcCorrelationId: visaProfiles?.srcCorrelationId ?? "",
      srciTransactionId: initObj.srciTransactionId ?? "",
      complianceSettings: createComplianceSettings({
        locale: config.locale,
        saveDevice,
      }),
      windowRef: windowRef ?? null,
    }
  );

  if (encryptCardFn && !srcDigitalCardId) {
    let encryptedCard: string;

    try {
      encryptedCard = await encryptCardFn();
    } catch (error) {
      logger.error("Error encrypting card:", error);
      throw new Error("Failed to encrypt card", { cause: error });
    }

    request.encryptedCard = encryptedCard;
    request.consumer = consumer;
  } else {
    request.idToken = sharedIdToken;
    request.srcDigitalCardId = srcDigitalCardId;
  }

  return request;
}

export const createComplianceSettings = ({
  saveDevice,
  locale,
}: {
  saveDevice?: boolean;
  locale: string;
}): ComplianceSettings => {
  const complianceResources: ComplianceSettings["complianceResources"] = [];

  if (saveDevice) {
    complianceResources.push({
      complianceType: "REMEMBER_ME",
      uri: getVisaPrivacyPolicyLink(locale),
    });
  }

  complianceResources.push({
    complianceType: "TERMS_AND_CONDITIONS",
    uri: getVisaTermsLink(locale),
  });

  complianceResources.push({
    complianceType: "PRIVACY_POLICY",
    uri: getVisaPrivacyPolicyLink(locale),
  });

  return { complianceResources };
};
