export const VISA = "visa";

export const TIMEOUT_DURATION = 10000; // 10 seconds

export const VISA_SDK_URL =
  "https://assets.secure.checkout.visa.com/checkout-widget/resources/js/src-i-adapter/visaSdk.js?v2";

export const VISA_SDK_SANDBOX_URL =
  "https://sandbox-assets.secure.checkout.visa.com/checkout-widget/resources/js/src-i-adapter/visaSdk.js?v2";

/**
 * Validates and sanitizes a locale string to prevent URL path injection.
 * Accepts formats like "en_US", "pl_PL", "en-us", "en-US".
 * Throws if the locale doesn't match expected patterns.
 */
function sanitizeLocale(locale: string): string {
  const sanitized = locale.replace("_", "-").toLowerCase();
  if (!/^[a-z]{2}-[a-z]{2}$/.test(sanitized)) {
    throw new Error(
      `Invalid locale format: "${locale}". Expected format like "en_US" or "en-us".`
    );
  }
  return sanitized;
}

export const getVisaTermsLink = (locale: string) => {
  const safe = sanitizeLocale(locale);
  return `https://www.visa.com/${safe}/checkout/legal/terms-of-service.html`;
};

export const getVisaPrivacyPolicyLink = (locale: string) => {
  const safe = sanitizeLocale(locale);
  return `https://www.visa.com/${safe}/checkout/legal/global-privacy-notice.html`;
};
