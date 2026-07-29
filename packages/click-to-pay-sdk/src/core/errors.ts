import type { Network } from "../types/internal";

/**
 * `reason` codes returned by the network SRC SDKs (Mastercard SRCSDK / Visa SRCI) across
 * identityLookup, initiateIdentityValidation, completeIdentityValidation, checkout and
 * unbindAppInstance calls. Visa and Mastercard both implement the EMVCo SRC spec and share
 * this vocabulary, so a single list applies to either network.
 */
export type SrcErrorCode =
  // completeIdentityValidation
  | "CODE_INVALID"
  | "CODE_EXPIRED"
  | "RETRIES_EXCEEDED"
  | "VALIDATION_DATA_MISSING"
  | "ACCT_INACCESSIBLE"
  // checkout
  | "CARD_ADD_FAILED"
  | "CARD_SECURITY_CODE_MISSING"
  | "CARD_INVALID"
  | "CARD_EXP_INVALID"
  | "CARD_MISSING"
  | "CARD_NOT_RECOGNIZED"
  | "MERCHANT_DATA_INVALID"
  | "UNABLE_TO_CONNECT"
  | "AUTH_INVALID"
  | "TERMS_AND_CONDITIONS_NOT_ACCEPTED"
  | "IDENTITY_VALIDATION_REQUIRED"
  // shared across all SRC calls
  | "UNKNOWN_ERROR"
  | "REQUEST_TIMEOUT"
  | "SERVER_ERROR"
  | "INVALID_PARAMETER"
  | "INVALID_REQUEST"
  | "AUTH_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMIT_EXCEEDED"
  | "SERVICE_ERROR";

export type ClickToPayErrorCode =
  /** Click to Pay is not available for the given consumer / onboard data. */
  | "NOT_AVAILABLE"
  /** None of the network SDK scripts could be loaded. */
  | "SDK_LOAD_FAILED"
  /** Network SDK scripts loaded but none could be initialized. */
  | "SDK_INIT_FAILED"
  /** A method was called before `init()` completed. */
  | "NOT_INITIALIZED"
  /** No active network resolved (no recognized / present consumer). */
  | "NO_ACTIVE_NETWORK"
  /** Onboard data is missing (internal invariant; call `init()` first). */
  | "MISSING_ONBOARD_DATA"
  /** The instance has been disposed and can no longer be used. */
  | "DISPOSED"
  /** The OTP code entered by the consumer was rejected (SRC reason `CODE_INVALID`). */
  | "INVALID_OTP"
  /** The OTP code is no longer valid and must be re-requested (SRC reason `CODE_EXPIRED`). */
  | "OTP_EXPIRED"
  /** Too many OTP attempts were made (SRC reason `RETRIES_EXCEEDED`). */
  | "OTP_RETRIES_EXCEEDED"
  /** The consumer's account exists but is locked/inaccessible (SRC reason `ACCT_INACCESSIBLE`). Can surface from `validateIdentity()` and `checkout()`. */
  | "ACCT_INACCESSIBLE"
  /** Any other named SRC error (e.g. `CARD_INVALID`, `MERCHANT_DATA_INVALID`, `SERVER_ERROR`) — see `networkReason` for the exact reason. */
  | SrcErrorCode
  /** A network SDK call failed with an error that could not be traced back to a known SRC reason — see `cause`. */
  | "NETWORK_ERROR";

export interface ClickToPayErrorOptions {
  cause?: unknown;
  /** The network whose SDK raised the underlying error, if known. */
  network?: Network;
  /**
   * The raw `reason` string returned by the network's SRC SDK (e.g. `"CODE_INVALID"`),
   * when the error could be traced back to one. Always set alongside a matching `code`,
   * but also useful as a stable escape hatch if the network introduces a new reason
   * that isn't part of `SrcErrorCode` yet (in which case `code` falls back to `NETWORK_ERROR`).
   */
  networkReason?: string;
}

export class ClickToPayError extends Error {
  readonly code: ClickToPayErrorCode;
  override readonly cause?: unknown;
  readonly network?: Network;
  readonly networkReason?: string;

  constructor(
    code: ClickToPayErrorCode,
    message: string,
    options?: ClickToPayErrorOptions
  ) {
    super(message);
    this.name = "ClickToPayError";
    this.code = code;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
    this.network = options?.network;
    this.networkReason = options?.networkReason;

    Object.setPrototypeOf(this, ClickToPayError.prototype);
  }
}

export function isClickToPayError(error: unknown): error is ClickToPayError {
  return error instanceof ClickToPayError;
}
