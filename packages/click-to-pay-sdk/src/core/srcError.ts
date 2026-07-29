import { ClickToPayErrorCode, SrcErrorCode } from "./errors";

const REASON_TO_CODE: Record<SrcErrorCode, ClickToPayErrorCode> = {
  CODE_INVALID: "INVALID_OTP",
  CODE_EXPIRED: "OTP_EXPIRED",
  RETRIES_EXCEEDED: "OTP_RETRIES_EXCEEDED",
  VALIDATION_DATA_MISSING: "VALIDATION_DATA_MISSING",
  ACCT_INACCESSIBLE: "ACCT_INACCESSIBLE",
  CARD_ADD_FAILED: "CARD_ADD_FAILED",
  CARD_SECURITY_CODE_MISSING: "CARD_SECURITY_CODE_MISSING",
  CARD_INVALID: "CARD_INVALID",
  CARD_EXP_INVALID: "CARD_EXP_INVALID",
  CARD_MISSING: "CARD_MISSING",
  CARD_NOT_RECOGNIZED: "CARD_NOT_RECOGNIZED",
  MERCHANT_DATA_INVALID: "MERCHANT_DATA_INVALID",
  UNABLE_TO_CONNECT: "UNABLE_TO_CONNECT",
  AUTH_INVALID: "AUTH_INVALID",
  TERMS_AND_CONDITIONS_NOT_ACCEPTED: "TERMS_AND_CONDITIONS_NOT_ACCEPTED",
  IDENTITY_VALIDATION_REQUIRED: "IDENTITY_VALIDATION_REQUIRED",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  REQUEST_TIMEOUT: "REQUEST_TIMEOUT",
  SERVER_ERROR: "SERVER_ERROR",
  INVALID_PARAMETER: "INVALID_PARAMETER",
  INVALID_REQUEST: "INVALID_REQUEST",
  AUTH_ERROR: "AUTH_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  SERVICE_ERROR: "SERVICE_ERROR",
};

/**
 * Extracts the SRC `reason` string from a rejected network SDK call. Mastercard and Visa
 * are not fully consistent about nesting (flat `{ reason }` vs `{ error: { reason } }`),
 * so both shapes are checked.
 */
export function extractSrcReason(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;

  const err = error as Record<string, unknown>;
  const nested = err["error"] as Record<string, unknown> | undefined;
  const reason = err["reason"] ?? nested?.["reason"] ?? err["errorReason"];

  return typeof reason === "string" ? reason : undefined;
}

/** Maps a raw SRC `reason` string to a `ClickToPayErrorCode`, falling back to `NETWORK_ERROR` for unrecognized reasons. */
export function toClickToPayErrorCode(
  reason: string | undefined
): ClickToPayErrorCode {
  if (reason && reason in REASON_TO_CODE) {
    return REASON_TO_CODE[reason as SrcErrorCode];
  }
  return "NETWORK_ERROR";
}
