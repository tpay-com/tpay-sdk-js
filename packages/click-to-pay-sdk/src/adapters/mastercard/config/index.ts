import { DpaTransactionOptions } from "../types";

export const MASTERCARD = "mastercard";

export const TIMEOUT_DURATION = 10000;

export const MASTERCARD_SDK_URL =
  "https://src.mastercard.com/sdk/srcsdk.mastercard.js";
export const MASTERCARD_SDK_SANDBOX_URL =
  "https://sandbox.src.mastercard.com/sdk/srcsdk.mastercard.js";

export const getMastercardTermsLink = () => {
  return "https://www.mastercard.com/global/click-to-pay/country-listing/terms.html";
};
export const getMastercardPrivacyPolicyLink = () => {
  return "https://www.mastercard.com/global/click-to-pay/country-listing/privacy.html";
};

export const MASTERCARD_INIT_SDK_TRANSACTION_OPTIONS: Partial<DpaTransactionOptions> =
  {
    customInputData: {
      "com.mastercard.dcfExperience": "WITHIN_CHECKOUT",
    },
    confirmPayment: false,
    dpaShippingPreference: "NONE",
    dpaBillingPreference: "NONE",
    isGuestCheckout: false,
    dpaAcceptedBillingCountries: [],
    dpaAcceptedShippingCountries: [],
  };

export const MASTERCARD_SDK_TRANSACTION_OPTIONS: Partial<DpaTransactionOptions> =
  {
    ...MASTERCARD_INIT_SDK_TRANSACTION_OPTIONS,
    consumerNationalIdentifierRequested: false,
    consumerEmailAddressRequested: true,
    consumerNameRequested: true,
    consumerPhoneNumberRequested: true,

    paymentOptions: {
      dpaDynamicDataTtlMinutes: 15,
      dynamicDataType: "CARD_APPLICATION_CRYPTOGRAM_SHORT_FORM",
    },
  };
