import { makeContext } from "../../../testUtils";
import { buildCheckoutRequest } from "./requestBuilders";

describe("visa buildCheckoutRequest", () => {
  it("flags a guest (no sharedIdToken) enrolling their first card as merchant-orchestrated", async () => {
    const context = makeContext({
      encryptCardFn: async () => "encrypted-card-jwt",
    });

    const request = await buildCheckoutRequest(
      {
        network: "visa",
        consumer: { firstName: "John", lastName: "Doe" },
      },
      context
    );

    expect(request.dpaTransactionOptions?.customInputData?.customFlowType).toBe(
      "withincheckout"
    );
    expect(
      request.dpaTransactionOptions?.customInputData?.checkoutOrchestrator
    ).toBe("merchant");
    expect(request.encryptedCard).toBe("encrypted-card-jwt");
    expect(request.srcDigitalCardId).toBeUndefined();
  });

  it("flags an already-identified payer enrolling an additional card the same way", async () => {
    const context = makeContext({
      encryptCardFn: async () => "encrypted-card-jwt",
      sharedIdToken: "existing-id-token",
    });

    const request = await buildCheckoutRequest(
      {
        network: "visa",
        consumer: { firstName: "John", lastName: "Doe" },
      },
      context
    );

    expect(request.dpaTransactionOptions?.customInputData?.customFlowType).toBe(
      "withincheckout"
    );
    expect(
      request.dpaTransactionOptions?.customInputData?.checkoutOrchestrator
    ).toBe("merchant");
    expect(request.encryptedCard).toBe("encrypted-card-jwt");
  });

  it("also flags merchant-orchestrated checkout when paying with a card on file", async () => {
    const context = makeContext({ sharedIdToken: "shared-tok" });

    const request = await buildCheckoutRequest(
      { network: "visa", srcDigitalCardId: "card-123" },
      context
    );

    expect(request.dpaTransactionOptions?.customInputData?.customFlowType).toBe(
      "withincheckout"
    );
    expect(
      request.dpaTransactionOptions?.customInputData?.checkoutOrchestrator
    ).toBe("merchant");
    expect(request.srcDigitalCardId).toBe("card-123");
    expect(request.idToken).toBe("shared-tok");
    expect(request.encryptedCard).toBeUndefined();
  });

  it("throws when onboardData.visaInitObject is missing", async () => {
    const context = makeContext({
      onboardData: {
        ...makeContext().onboardData,
        visaInitObject: null,
      },
    });

    await expect(
      buildCheckoutRequest(
        { network: "visa", srcDigitalCardId: "card-1" },
        context
      )
    ).rejects.toThrow(
      "onboardData.visaInitObject is required but was not provided"
    );
  });
});
