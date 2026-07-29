import { mastercardSdkMock } from "../../../jest.setup";
import { makeContext, makeOnboardData } from "../../testUtils";
import { MastercardAdapter } from "./mastercardSdkAdapter";

jest.mock("./utils", () => ({
  loadSDK: jest.fn().mockResolvedValue(undefined),
  buildCheckoutRequest: jest
    .fn()
    .mockReturnValue({ srcDigitalCardId: "card-123" }),
  createValidationComplianceSettings: jest.fn().mockReturnValue(undefined),
  createCheckoutComplianceSettings: jest
    .fn()
    .mockReturnValue({ complianceResources: [] }),
}));

describe("MastercardAdapter", () => {
  let adapter: MastercardAdapter;

  beforeEach(() => {
    adapter = new MastercardAdapter();
    adapter["sdk"] = mastercardSdkMock;
    adapter["sdkIsLoaded"] = true;
  });

  afterEach(() => jest.clearAllMocks());

  describe("isEnabled", () => {
    it("returns true when isAvailable and mastercardInitObject are present", () => {
      expect(adapter.isEnabled(makeOnboardData())).toBe(true);
    });

    it("returns false when isAvailable is false", () => {
      expect(adapter.isEnabled(makeOnboardData({ isAvailable: false }))).toBe(
        false
      );
    });

    it("returns false when mastercardInitObject is null", () => {
      expect(
        adapter.isEnabled(makeOnboardData({ mastercardInitObject: null }))
      ).toBe(false);
    });
  });

  describe("loadSdk", () => {
    it("sets sdkIsLoaded to true after loading", async () => {
      const fresh = new MastercardAdapter();
      await fresh.loadSdk("sandbox");
      expect(fresh["sdkIsLoaded"]).toBe(true);
    });

    it("skips loadSDK when already loaded", async () => {
      const { loadSDK } = require("./utils");
      await adapter.loadSdk("sandbox");
      expect(loadSDK).not.toHaveBeenCalled();
    });

    it("deduplicates concurrent load calls", async () => {
      const fresh = new MastercardAdapter();
      const [r1, r2] = await Promise.all([
        fresh.loadSdk("sandbox"),
        fresh.loadSdk("sandbox"),
      ]);
      expect(r1).toBeUndefined();
      expect(r2).toBeUndefined();
    });
  });

  describe("init", () => {
    it("calls sdk.init when enabled", async () => {
      await adapter.init(makeContext());
      expect(mastercardSdkMock.init).toHaveBeenCalledTimes(1);
    });

    it("skips sdk.init when isEnabled is false", async () => {
      await adapter.init(
        makeContext({ onboardData: makeOnboardData({ isAvailable: false }) })
      );
      expect(mastercardSdkMock.init).not.toHaveBeenCalled();
    });
  });

  describe("recognize", () => {
    it("returns recognized result with network on hit", async () => {
      mastercardSdkMock.isRecognized.mockResolvedValue({
        recognized: true,
        idTokens: ["tok-abc"],
      });
      const result = await adapter.recognize({
        recognitionTokens: ["tok-abc"],
      });
      expect(result).toEqual({
        recognized: true,
        network: "mastercard",
        idTokens: ["tok-abc"],
      });
    });

    it("passes tokens to sdk, defaulting to empty array", async () => {
      await adapter.recognize({});
      expect(mastercardSdkMock.isRecognized).toHaveBeenCalledWith({
        recognitionTokens: [],
      });
    });
  });

  describe("identityLookup", () => {
    it("returns consumerPresent:false on miss", async () => {
      const result = await adapter.identityLookup({
        email: "unknown@example.com",
      });
      expect(result.consumerPresent).toBe(false);
    });

    it("returns consumerPresent and network on hit", async () => {
      mastercardSdkMock.identityLookup.mockResolvedValue({
        consumerPresent: true,
      });
      const result = await adapter.identityLookup({
        email: "test@example.com",
      });
      expect(result).toEqual({ consumerPresent: true, network: "mastercard" });
    });

    it("throws when neither email nor phone is provided", async () => {
      await expect(adapter.identityLookup({})).rejects.toThrow(
        "Either email or phone must be provided for identity lookup."
      );
    });

    it("sends EMAIL_ADDRESS identity type for email", async () => {
      await adapter.identityLookup({ email: "test@example.com" });
      expect(mastercardSdkMock.identityLookup).toHaveBeenCalledWith(
        expect.objectContaining({
          consumerIdentity: expect.objectContaining({
            identityType: "EMAIL_ADDRESS",
          }),
        })
      );
    });
  });
});
