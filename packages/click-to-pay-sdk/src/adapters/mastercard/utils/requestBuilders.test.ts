import { makeConfig, makeOnboardData } from "../../../testUtils";
import { buildCheckoutRequest } from "./requestBuilders";

describe("mastercard buildCheckoutRequest", () => {
  const onboardData = makeOnboardData();
  const config = makeConfig();
  it("flags a guest (no idToken) enrolling their first card as a guest checkout", () => {
    const request = buildCheckoutRequest({
      config,
      onboardData,
      encryptedCard: "encrypted-card-jwt",
    });
    expect(
      request.dpaTransactionOptions?.customInputData?.[
        "com.mastercard.dcfExperience"
      ]
    ).toBe("WITHIN_CHECKOUT");
    expect(request.dpaTransactionOptions?.isGuestCheckout).toBe(true);
    expect(request.encryptedCard).toBe("encrypted-card-jwt");
    expect(request.srcDigitalCardId).toBeUndefined();
  });
  it("forwards the consumer so the DCF can prefill instead of asking the payer again", () => {
    const request = buildCheckoutRequest({
      config,
      onboardData,
      encryptedCard: "encrypted-card-jwt",
      consumer: {
        firstName: "John",
        lastName: "Doe",
        emailAddress: "john@example.com",
        mobileNumber: { countryCode: "48", phoneNumber: "111222333" },
      },
    });
    expect(request.consumer).toEqual({
      firstName: "John",
      lastName: "Doe",
      emailAddress: "john@example.com",
      mobileNumber: { countryCode: "48", phoneNumber: "111222333" },
    });
  });
  it("still flags isGuestCheckout when enrolling a card with an existing idToken", () => {
    const request = buildCheckoutRequest({
      config,
      onboardData,
      encryptedCard: "encrypted-card-jwt",
      idToken: "existing-id-token",
    });
    expect(request.dpaTransactionOptions?.isGuestCheckout).toBe(true);
    expect(request.encryptedCard).toBe("encrypted-card-jwt");
  });
  it("does not flag isGuestCheckout when paying with a card on file", () => {
    const request = buildCheckoutRequest({
      config,
      onboardData,
      srcDigitalCardId: "card-123",
      idToken: "existing-id-token",
    });
    expect(
      request.dpaTransactionOptions?.customInputData?.[
        "com.mastercard.dcfExperience"
      ]
    ).toBe("WITHIN_CHECKOUT");
    expect(request.dpaTransactionOptions?.isGuestCheckout).toBe(false);
    expect(request.srcDigitalCardId).toBe("card-123");
    expect(request.encryptedCard).toBeUndefined();
  });
  it("throws when neither encryptedCard nor srcDigitalCardId is provided", () => {
    expect(() => buildCheckoutRequest({ config, onboardData })).toThrow(
      "Either encryptedCard or srcDigitalCardId must be provided for checkout."
    );
  });
});
