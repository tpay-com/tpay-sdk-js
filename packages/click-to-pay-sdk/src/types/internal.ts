import type {
  CheckoutRequest as MastercardCheckoutRequest,
  Consumer as MastercardConsumer,
  DpaData as MastercardDpaData,
  DpaTransactionOptions as MastercardDpaTransactionOptions,
  MaskedCard as MastercardMaskedCard,
  GetSrcProfileResponse as MastercardSrcProfile,
} from "../adapters/mastercard/types";
import type {
  CheckoutInput as VisaCheckoutInput,
  Consumer as VisaConsumer,
  DpaData as VisaDpaData,
  DpaTransactionOptions as VisaDpaTransactionOptions,
  MaskedCard as VisaMaskedCard,
  GetSrcProfileResponse as VisaSrcProfile,
} from "../adapters/visa/types";
import type { C2PConfigInfer, StageInfer } from "./schema";

export type C2PConfig = C2PConfigInfer;

export interface C2PHooks {
  onboardFn: (props: {
    email?: string;
    phone?: string;
  }) => Promise<OnboardData>;
  saveRecognitionTokenFn?: (props: {
    network: Network;
    recognitionToken: string;
    email?: string;
    phone?: string;
  }) => Promise<void>;
}

export type Stage = StageInfer;
export type Network = "visa" | "mastercard";
export type ValidationChannelId = "EMAIL_ADDRESS" | "MOBILE_PHONE_NUMBER";

/**
 * Onboarding
 */
export interface MastercardInitObject {
  srcInitiatorId: string;
  srciTransactionId: string;
  srciDpaId: string;
  dpaTransactionOptions: MastercardDpaTransactionOptions;
  dpaData?: MastercardDpaData;
}

export interface VisaInitObject {
  srcInitiatorId: string;
  srciTransactionId: string;
  srciDpaId: string;
  dpaTransactionOptions: VisaDpaTransactionOptions;
  dpaData?: VisaDpaData;
}

export interface OnboardData {
  isAvailable: boolean;
  availableNetworks: Network[];
  stage: Stage;
  mastercardInitObject: MastercardInitObject | null;
  visaInitObject: VisaInitObject | null;
  recognitionToken: {
    mastercard: string | null;
    visa: string | null;
  };
  transactionDetails?: {
    amount: number;
    description: string;
  };
}

export type InitializationResult =
  | "ALREADY_INITIALIZED"
  | "RECOGNIZED"
  | "REQUIRES_OTP"
  | "NOT_RECOGNIZED";

export type ProfilesByNetwork =
  | (VisaSrcProfile & { network: "visa" })
  | (MastercardSrcProfile & { network: "mastercard" });

export interface C2PContext {
  config: C2PConfig;
  onboardData: OnboardData;
  sharedIdToken?: string;
  profilesByNetwork?: ProfilesByNetwork[];
  encryptCardFn?: () => Promise<string>;
}

export interface RecognizeResult {
  network: Network;
  recognized: boolean;
  idTokens?: string[];
}

export interface LookupResult {
  network: Network;
  consumerPresent: boolean;
}

export interface ValidateResult {
  idToken?: string;
  recognitionToken?: string;
}

export interface VisaCheckoutRequest extends VisaCheckoutInput {
  saveDevice?: boolean;
}

export { MastercardCheckoutRequest, MastercardConsumer, VisaConsumer };

export interface CheckoutInput {
  network: Network;
  srcDigitalCardId?: string;
  saveDevice?: boolean;
  windowRef?: Window | null;
  consumer?: MastercardConsumer | VisaConsumer;
}

export interface CheckoutOutput {
  checkoutResponse?: unknown;
  checkoutResponseSignature?: string;
  dcfActionCode: string;
  unbindAppInstance?: boolean;
  idToken?: string;
  recognitionToken?: string;
}

export type MaskedCardsUnion =
  | (VisaMaskedCard & { network: "visa" })
  | (MastercardMaskedCard & { network: "mastercard" });

export interface MaskedCard {
  network: Network;
  srcDigitalCardId: string;
  panBin?: string;
  panLastFour?: string;
  panExpirationMonth?: string;
  panExpirationYear?: string;
  dateOfCardCreated: string;
  dateOfCardLastUsed?: string;
  tokenBinRange?: string;
  tokenLastFour?: string;
  paymentCardType: string;
  presentationName?: string;
  artUri?: string;
  status?: "ACTIVE" | "SUSPENDED" | "EXPIRED" | "PENDING" | "CANCELLED";
  descriptorName?: string;
}
