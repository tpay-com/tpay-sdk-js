import type {
  C2PContext,
  CheckoutInput,
  CheckoutOutput,
  LookupResult,
  Network,
  OnboardData,
  RecognizeResult,
  Stage,
  ValidateResult,
  ValidationChannelId,
} from "../types/internal";

export interface NetworkAdapter<
  TProfile = unknown,
  TCheckoutInput = CheckoutInput,
  TCheckoutResponse = CheckoutOutput,
> {
  readonly network: Network;

  isEnabled(onboardData: OnboardData): boolean;

  loadSdk(stage: Stage): Promise<void>;

  init(context: C2PContext): Promise<void>;

  recognize(input: {
    recognitionTokens?: string[];
    idToken?: string;
  }): Promise<RecognizeResult>;

  identityLookup(input: {
    email?: string;
    phone?: string;
  }): Promise<LookupResult>;

  initiateValidation(channelId?: ValidationChannelId): Promise<unknown>;

  validateIdentity(input: {
    code: string;
    saveDevice?: boolean;
  }): Promise<ValidateResult>;

  getSrcProfile(idTokens?: string[]): Promise<TProfile>;

  checkout(
    input: TCheckoutInput,
    context: C2PContext
  ): Promise<TCheckoutResponse>;

  unbind(input: { idToken?: string; recognitionToken?: string }): Promise<void>;
}
