import { C2PContext, OnboardData } from "./types/internal";

export const makeConfig = () => ({
  transactionId: "tx-123",
  stage: "sandbox" as const,
  locale: "pl_PL",
  currency: "PLN",
  amount: 1000,
  email: "test@example.com",
});

export const makeOnboardData = (
  overrides: Partial<OnboardData> = {}
): OnboardData => ({
  isAvailable: true,
  availableNetworks: ["visa", "mastercard"],
  stage: "sandbox",
  mastercardInitObject: {
    srcInitiatorId: "mc-initiator",
    srciTransactionId: "mc-tx-id",
    srciDpaId: "mc-dpa-id",
    dpaTransactionOptions: { dpaLocale: "pl_PL" },
  },
  visaInitObject: {
    srcInitiatorId: "visa-initiator",
    srciTransactionId: "visa-tx-id",
    srciDpaId: "visa-dpa-id",
    dpaTransactionOptions: { dpaLocale: "pl_PL" },
  },
  recognitionToken: { mastercard: null, visa: null },
  ...overrides,
});

export const makeContext = (
  overrides: Partial<C2PContext> = {}
): C2PContext => ({
  config: makeConfig(),
  onboardData: makeOnboardData(),
  ...overrides,
});
