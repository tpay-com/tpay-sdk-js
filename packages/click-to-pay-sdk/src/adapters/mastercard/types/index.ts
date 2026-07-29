// ========== Shared Types ====================================================

type JWT = string;

type CardStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED" | "PENDING";
type ConsumerStatus = "ACTIVE" | "SUSPENDED" | "LOCKED";
type AddressVerbosity = "FULL" | "NONE" | "POSTAL_COUNTRY";
type DeviceType =
  "BROWSER" | "WEB_BROWSER" | "MOBILE_APP" | "IOT_DEVICE" | "OTHER";

type SrciActionCode = "NEW_USER" | "AUTH_FAILED" | "AUTH_SKIPPED";

export type EMAIL_ADDRESS = "EMAIL_ADDRESS";
export type MOBILE_PHONE_NUMBER = "MOBILE_PHONE_NUMBER";
export type IdentityType = EMAIL_ADDRESS | MOBILE_PHONE_NUMBER;

// ========== Adress & contact ================================================

interface Address {
  addressId: string;
  name?: string;
  line1?: string;
  line2?: string;
  line3?: string;
  city?: string;
  state?: string;
  zip?: string;
  /** ISO 3166-1 alpha-2 country code. */
  countryCode?: string;
}

interface MaskedAddress extends Address {
  /** UTC timestamp the address was created. */
  createTime?: string;
  /** UTC timestamp the address was last used. */
  lastUsedTime?: string;
}

interface PhoneNumber {
  /** International country code, 1–4 digits (no plus sign). */
  countryCode: string;
  /** Phone number without country code, 4–14 digits. */
  phoneNumber: string;
}

// ========== Consumer & identity =============================================

export interface Consumer {
  emailAddress?: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: PhoneNumber;
}

interface ConsumerIdentity {
  /** Entity or organization that collected and verified the identity. */
  identityProvider?: string;
  identityType: IdentityType;
  /** Used to locate information within the Click to Pay Profile. */
  identityValue: string;
}

type MaskedConsumerIdentity = ConsumerIdentity;

interface MaskedConsumer {
  /** SRC Consumer Reference Identifier. */
  srcConsumerId?: string;
  maskedConsumerIdentity: MaskedConsumerIdentity;
  /** @maxLength 255 */
  maskedEmailAddress?: string;
  maskedConsumerMobileNumber?: PhoneNumber;
  /** @maxLength 20 */
  maskedNationalIdentifier?: string;
  complianceSettings?: ComplianceSettings;
  /** ISO 3166 alpha-2 country code. */
  countryCode?: string;
  status?: ConsumerStatus;
  /** @maxLength 30 */
  maskedFirstName?: string;
  /** @maxLength 30 */
  maskedLastName?: string;
  /** @maxLength 60 */
  maskedFullname?: string;
  /** UTC timestamp when consumer was added. */
  dateConsumerAdded: string;
  /** UTC timestamp when consumer last transacted. */
  dateConsumerLastUsed?: string;
}

// ========== Compliance ======================================================

interface ComplianceVersion {
  /**
   * - `REMEMBER_ME`: Consumer consent to be remembered on a device/browser.
   * - `TERMS_AND_CONDITIONS`: Consent to Mastercard Terms and Conditions.
   * - `PRIVACY_POLICY`: Consent to Mastercard Privacy policies.
   */
  complianceType: "REMEMBER_ME" | "TERMS_AND_CONDITIONS" | "PRIVACY_POLICY";
  /** @maxLength 1024 */
  uri: string;
  /** @maxLength 10 */
  version?: string;
  /** UTC time in Unix epoch format. */
  datePublished?: string;
}

export interface ComplianceSettings {
  complianceResources: ComplianceVersion[];
}

// ========== Card ============================================================

interface DigitalCardData {
  /**
   * Status of the card in the Click to Pay System.
   * - `ACTIVE`: Can be used for checkout.
   * - `SUSPENDED`: Inactive/locked, cannot be used.
   * - `EXPIRED`: Past expiration date.
   * - `PENDING`: Awaiting additional authorization (e.g. PENDING_AVS, PENDING_SCA).
   */
  status: CardStatus;
  /** Consumer-defined nickname for the card. */
  presentationName?: string;
  /** SRC Program descriptor, consistent across all DCFs. */
  descriptorName: string;
  /** Full HTTPS URL to card art image. */
  artUri?: string;
  artHeight?: string;
  artWidth?: string;
}

interface DigitalCardFeature {
  /**
   * Content of the digital card feature (e.g. card benefits message).
   * @maxLength 74
   */
  content: string;
  /**
   * - `TEXT_STRING`
   * - `IMAGE_URL`
   * - `CONTENT_URL`
   * - `LINK_URL`
   */
  contentType: string;
  /** URI of a CSS stylesheet for presenting this feature. */
  style?: string;
  width?: string;
  height?: string;
}

interface DCF {
  applicationType?: DeviceType;
  /** @maxLength 255 */
  uri?: URL;
  /** @maxLength 255 */
  logoUri?: string;
  /** @maxLength 60 */
  name?: string;
}

export interface MaskedCard {
  srcDigitalCardId?: string;
  srcPaymentCardId: string;
  panBin: string;
  panLastFour: string;
  tokenBinRange?: string;
  tokenLastFour?: string;
  digitalCardData: DigitalCardData;
  digitalCardFeatures?: DigitalCardFeature[];
  panExpirationMonth?: string;
  panExpirationYear?: string;
  paymentCardDescriptor?: string;
  countryCode?: string;
  dateOfCardCreated: string;
  dateOfCardLastUsed?: string;
  digitalCardRelatedData: string;
  paymentCardType: string;
  maskedBillingAddress?: MaskedAddress;
  dcf?: DCF;
  serviceId?: string;
  paymentAccountReference?: string;
}

// ========== Transaction options =============================================

export interface TransactionAmount {
  /**
   * Amount in the format matching the ISO 4217 currency code (e.g. `100.00` for USD).
   * The decimal separator must be a dot (`.`).
   *
   * For Secure Card on File: auto-set to `0.00` when `authenticationReason` is
   * `ENROL_FINANCIAL_INSTRUMENT` or `CONSUMER_IDENTITY_VALIDATION` and not specified.
   * For Click to Pay: the final transaction amount must be provided.
   */
  transactionAmount: number;
  transactionCurrencyCode: string;
}

interface ThreeDsInputData {
  /**
   * Consumer's billing address.
   * Required for Secure Card on File authentication.
   */
  billingAddress: Address;
  /**
   * Consumer's shipping address.
   * Required for Secure Card on File authentication.
   */
  shippingAddress: Address;
  /**
   * Forces the user to complete a verification challenge.
   * Required when enrolling a financial instrument and device binding via 3DS.
   */
  forceChallenge?: boolean;
}

interface CustomInputData {
  /**
   * Configures when card enrollment is offered (Mastercard cards only).
   * - `WITHIN_CHECKOUT`: Guest checkout flow.
   * - `PAYMENT_SETTINGS`: Card management flow (no guest checkout).
   *
   * Required (with `confirmPayment`) to enable the Embedded checkout experience.
   */
  "com.mastercard.dcfExperience"?: "WITHIN_CHECKOUT" | "PAYMENT_SETTINGS";

  /**
   * Accepted card brands.
   * Defaults to Mastercard only when omitted.
   */
  "com.mastercard.acceptedCardBrands"?: ("mastercard" | "maestro")[];
}

interface AuthenticationPreferences {
  /**
   * - `AUTHENTICATED`: Integrator has requested authenticated payload.
   * - `NON_AUTHENTICATED`: Integrator has opted out of authentication.
   */
  payloadRequested?: "AUTHENTICATED" | "NON_AUTHENTICATED";
}

export interface DpaTransactionOptions {
  /** ISO 3166 alpha-2 accepted billing country codes. */
  dpaAcceptedBillingCountries?: string[];
  /** ISO 3166-1 alpha-2 accepted shipping country codes. Empty means all accepted. */
  dpaAcceptedShippingCountries?: string[];

  /**
   * Verbosity of billing address required.
   * Defaults to `NONE`.
   */
  dpaBillingPreference?: AddressVerbosity;

  /**
   * Verbosity of shipping address required.
   * Defaults to `NONE`.
   */
  dpaShippingPreference?: "FULL" | "NONE";

  dpaLocale: string;
  authenticationPreferences?: AuthenticationPreferences;

  /** Default: `false` */
  consumerNationalIdentifierRequested?: boolean;
  /** Default: `false` */
  consumerNameRequested?: boolean;
  /** Default: `false` */
  consumerEmailAddressRequested?: boolean;
  /** Default: `false` */
  consumerPhoneNumberRequested?: boolean;

  paymentOptions?: {
    dynamicDataType?: "CARD_APPLICATION_CRYPTOGRAM_SHORT_FORM" | "NONE";
    /**
     * Currently not supported by Mastercard SRC
     */
    dpaDynamicDataTtlMinutes?: number;
  };
  transactionType?: string;

  /**
   * Transaction amount and currency.
   * Must appear in `init()`, `authenticate()`, or `checkout()`.
   * Required in `authenticate()` when `authenticationReason` is
   * `CARD_VERIFICATION` or `TRANSACTION_AUTHENTICATION`.
   */
  transactionAmount?: TransactionAmount;

  /**
   * 3DS-related input data.
   * Required when transaction authentication is performed.
   */
  threeDsInputData?: ThreeDsInputData;

  isGuestCheckout?: boolean;
  customInputData?: CustomInputData;

  /**
   * Controls whether a loading screen or a Confirm Payment prompt is shown after card selection.
   * Default: `false`.
   * - `false`: Consumer sees a 'Continue' loading screen.
   * - `true`: Consumer sees a 'Confirm payment' prompt on DCF.
   *
   * Set alongside `customInputData` to enable the Click to Pay checkout experience.
   */
  confirmPayment?: boolean;

  /**
   * Acquiring institution identification code.
   *
   * Secure Card on File: required when `authenticationReasons = TRANSACTION_AUTHENTICATION`;
   * falls back to `acquirerMerchantId` in `authenticationContext` if omitted.
   * Click to Pay: required when `payloadRequested = AUTHENTICATED`.
   */
  acquirerMerchantId?: string;

  /**
   * Acquiring institution BIN as assigned by the 3DS Directory Server.
   *
   * Secure Card on File: required when `authenticationReasons = TRANSACTION_AUTHENTICATION`
   * or `acquirerBIN` is absent from `authenticationContext`.
   * Click to Pay: required when `payloadRequested = AUTHENTICATED`.
   */
  acquirerBin?: string;

  /**
   * Merchant category code (e.g. `4444`).
   *
   * Secure Card on File: required when `authenticationMethodType = 3DS | MANAGED_AUTHENTICATION`.
   * Click to Pay: required when `payloadRequested = AUTHENTICATED`.
   */
  merchantCategoryCode?: string;

  /**
   * ISO 3166 merchant country code (e.g. `US`).
   *
   * Secure Card on File: required when `authenticationMethodType = 3DS | MANAGED_AUTHENTICATION`.
   * Click to Pay: required when `payloadRequested = AUTHENTICATED`.
   */
  merchantCountryCode?: string;
}

// ========== Init ============================================================

export interface DpaData {
  /** Legal name of the registered DPA. */
  dpaName: string;
  dpaPresentationName?: string;
  dpaUri?: string;
}

export interface InitInput {
  /** Integrator identifier generated during Mastercard onboarding. */
  srcInitiatorId: string;
  /** DPA identifier generated during registration. */
  srciDpaId: string;
  /** Unique session-tracking ID, correlated from button impression to end of transaction. */
  srciTransactionId: string;
  dpaTransactionOptions: DpaTransactionOptions;
  /** Optionally overrides previously registered DPA data (e.g. presentation name). */
  dpaData?: DpaData;
}

// ========== SDK method request / response pairs =============================

// --- isRecognized ---

export interface IsRecognizedRequest {
  /** JWTs containing recognition tokens previously stored on the device/browser. */
  recognitionTokens?: string[];
}

export interface IsRecognizedResponse {
  recognized: boolean;
  /** Supplied only when one or more SRC profiles are located. */
  idTokens?: string[];
}

// --- getSrcProfile ---

interface SrcProfile {
  authorization?: string;
  maskedCards: MaskedCard[];
  consumer?: MaskedConsumer;
  shippingAddresses: Address[];
}

export interface GetSrcProfileResponse {
  profiles?: SrcProfile[];
  srcCorrelationId?: string;
}

// --- identityLookup ---

export interface IdentityLookupResponse {
  consumerPresent: boolean;
  lastUsedCardTimestamp?: string;
}

// --- initiateIdentityValidation ---

export interface InitiateIdentityValidationResponse {
  maskedValidationChannel: string;
  supportedValidationChannels: {
    identityType: IdentityType;
    maskedValidationChannel: string;
  }[];
  validationMessage?: string;
}

// --- completeIdentityValidation ---

export interface CompleteIdentityValidationResponse {
  idToken: string;
  recognitionToken?: string;
}

// --- enrollCard ---

export interface EnrollCardResponse {
  maskedCard: MaskedCard;
  srcCorrelationId?: string;
}

// --- checkout ---

interface VerificationData {
  verificationType: "CARDHOLDER";
  verificationEntity: string;
  verificationEvents?: string[];
  verificationMethod: string;
  verificationResults: string;
  verificationTimestamp: string;
  additionalData?: string;
}

interface AssuranceData {
  verificationData: VerificationData[];
  eci?: string;
}

interface CheckoutResponseData {
  payload?: string;
  srcCorrelationId: string;
  maskedCard: MaskedCard;
  maskedConsumer?: MaskedConsumer;
  shippingAddressZip?: string;
  shippingCountryCode?: string;
  threeDsOutputData?: any[];
  networkSpecificOutputData?: any[];
  assuranceData?: AssuranceData;
  eventHistory?: any;
  unbindAppInstance?: boolean;
}

export interface CheckoutResponse {
  dcfActionCode:
    | "COMPLETE"
    | "CHANGE_CARD"
    | "ADD_CARD"
    | "SWITCH_CONSUMER"
    | "CANCEL"
    | "ERROR";
  checkoutResponse?: CheckoutResponseData;
  checkoutResponseSignature?: string;
  idToken?: string;
  recognitionToken?: string;
  unbindAppInstance?: boolean;
}

export interface CheckoutRequest {
  srcDigitalCardId?: string;
  encryptedCard?: string;
  idToken?: string;
  saveDevice?: boolean;
  dpaTransactionOptions?: DpaTransactionOptions;
  srciActionCode?: SrciActionCode;
  windowRef?: Window | null;
  consumer?: Consumer;
  payloadTypeIndicatorCheckout?: "SUMMARY" | "FULL";
  complianceSettings?: ComplianceSettings;
}

// --- unbindAppInstance ---

// (internal — not exported; types used only within the SDK interface below)

// ========== SDK interface ===================================================

export interface MastercardSdk {
  init: (initData: InitInput) => Promise<void>;

  isRecognized: (request: IsRecognizedRequest) => Promise<IsRecognizedResponse>;

  getSrcProfile: (request: {
    idTokens?: JWT[];
  }) => Promise<GetSrcProfileResponse>;

  identityLookup: (request: {
    consumerIdentity: ConsumerIdentity;
  }) => Promise<IdentityLookupResponse>;

  initiateIdentityValidation: (request: {
    requestedValidationChannelId?: string;
  }) => Promise<InitiateIdentityValidationResponse>;

  completeIdentityValidation: (request: {
    validationData: string;
    complianceSettings?: ComplianceSettings;
  }) => Promise<CompleteIdentityValidationResponse>;

  enrollCard: (request: {
    encryptedCard: JWT;
    idToken?: JWT;
  }) => Promise<EnrollCardResponse>;

  checkout: (request: CheckoutRequest) => Promise<CheckoutResponse>;

  unbindAppInstance: (request: {
    idToken?: JWT;
    recognitionToken?: string;
  }) => Promise<{ srcCorrelationId: string }>;
}

declare global {
  interface Window {
    SRCSDK_MASTERCARD?: MastercardSdk;
  }
}
