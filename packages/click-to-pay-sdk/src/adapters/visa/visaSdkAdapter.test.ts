import { visaSdkMock } from "../../../jest.setup";
import { makeContext, makeOnboardData } from "../../testUtils";
import { VISA } from "./config";
import { GetSrcProfileResponse } from "./types";
import { VisaAdapter } from "./visaSdkAdapter";

jest.mock("./utils", () => ({
  loadSDK: jest.fn().mockResolvedValue(undefined),
  buildCheckoutRequest: jest
    .fn()
    .mockResolvedValue({ srcDigitalCardId: "card-123" }),
  createComplianceSettings: jest
    .fn()
    .mockReturnValue({ complianceResources: [] }),
}));

describe("VisaAdapter", () => {
  let adapter: VisaAdapter;

  beforeEach(() => {
    adapter = new VisaAdapter();
    adapter["sdk"] = visaSdkMock;
    adapter["sdkIsLoaded"] = true;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("network", () => {
    it("has network set to 'visa'", () => {
      expect(adapter.network).toBe(VISA);
    });
  });

  describe("isEnabled", () => {
    it("returns true when isAvailable and visaInitObject are present", () => {
      expect(adapter.isEnabled(makeOnboardData())).toBe(true);
    });

    it("returns false when isAvailable is false", () => {
      expect(adapter.isEnabled(makeOnboardData({ isAvailable: false }))).toBe(
        false
      );
    });

    it("returns false when visaInitObject is null", () => {
      expect(adapter.isEnabled(makeOnboardData({ visaInitObject: null }))).toBe(
        false
      );
    });
  });

  describe("loadSdk", () => {
    it("loads the SDK and sets sdkIsLoaded to true", async () => {
      const freshAdapter = new VisaAdapter();
      await freshAdapter.loadSdk("sandbox");
      expect(freshAdapter["sdkIsLoaded"]).toBe(true);
    });

    it("skips loadSDK when already loaded", async () => {
      const { loadSDK } = require("./utils");
      await adapter.loadSdk("sandbox");
      expect(loadSDK).not.toHaveBeenCalled();
    });

    it("deduplicates concurrent load calls", async () => {
      const fresh = new VisaAdapter();
      const [r1, r2] = await Promise.all([
        fresh.loadSdk("sandbox"),
        fresh.loadSdk("sandbox"),
      ]);
      expect(r1).toBeUndefined();
      expect(r2).toBeUndefined();
    });

    it("throws when VisaSRCI is not on window after load", async () => {
      (global as any).window.vAdapters.VisaSRCI = undefined;
      const fresh = new VisaAdapter();
      await expect(fresh.loadSdk("sandbox")).rejects.toThrow(
        "Visa SDK not available on window"
      );
      (global as any).window.vAdapters.VisaSRCI = jest.fn(() => visaSdkMock);
    });
  });

  describe("init", () => {
    it("calls sdk.init with transactionAmount derived from config", async () => {
      await adapter.init(makeContext());
      expect(visaSdkMock.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dpaTransactionOptions: expect.objectContaining({
            transactionAmount: expect.objectContaining({
              transactionAmount: "10.00",
              transactionCurrencyCode: "PLN",
            }),
          }),
        })
      );
    });

    it("skips sdk.init when isEnabled is false", async () => {
      await adapter.init(
        makeContext({ onboardData: makeOnboardData({ isAvailable: false }) })
      );
      expect(visaSdkMock.init).not.toHaveBeenCalled();
    });
  });

  describe("recognize", () => {
    it("passes recognitionTokens to sdk.isRecognized", async () => {
      await adapter.recognize({
        recognitionTokens: ["visa-recognition-token"],
      });

      expect(visaSdkMock.isRecognized).toHaveBeenCalledWith({
        recognitionTokens: ["visa-recognition-token"],
        idTokens: undefined,
      });
    });

    it("derives idTokens from idToken for sdk.isRecognized", async () => {
      await adapter.recognize({ idToken: "shared-id-token" });

      expect(visaSdkMock.isRecognized).toHaveBeenCalledWith({
        recognitionTokens: undefined,
        idTokens: ["shared-id-token"],
      });
    });

    it("calls sdk.isRecognized with an empty payload when tokens are missing", async () => {
      await adapter.recognize();

      expect(visaSdkMock.isRecognized).toHaveBeenCalledWith({
        recognitionTokens: undefined,
        idTokens: undefined,
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
      visaSdkMock.identityLookup.mockResolvedValue({ consumerPresent: true });
      const result = await adapter.identityLookup({
        email: "test@example.com",
      });
      expect(result).toEqual({ consumerPresent: true, network: "visa" });
    });

    it("throws when neither email nor phone is provided", async () => {
      await expect(adapter.identityLookup({})).rejects.toThrow(
        "Either email or phone must be provided for identity lookup."
      );
    });

    it("sends EMAIL_ADDRESS type for email", async () => {
      await adapter.identityLookup({ email: "test@example.com" });
      expect(visaSdkMock.identityLookup).toHaveBeenCalledWith(
        expect.objectContaining({
          identityType: "EMAIL_ADDRESS",
          identityValue: "test@example.com",
        })
      );
    });

    it("sends MOBILE_PHONE_NUMBER type for phone", async () => {
      await adapter.identityLookup({ phone: "+48123456789" });
      expect(visaSdkMock.identityLookup).toHaveBeenCalledWith(
        expect.objectContaining({ identityType: "MOBILE_PHONE_NUMBER" })
      );
    });
  });

  describe("initiateValidation", () => {
    it("returns the sdk response", async () => {
      const result = await adapter.initiateValidation();
      expect(result).toEqual({ maskedValidationChannel: "t***@example.com" });
    });
  });

  describe("validateIdentity", () => {
    it("returns idToken and passes code as validationData", async () => {
      const result = await adapter.validateIdentity({ code: "123456" });
      expect(result.idToken).toBe("mock-id-token");
      expect(visaSdkMock.completeIdentityValidation).toHaveBeenCalledWith({
        validationData: "123456",
      });
    });

    it("propagates sdk errors", async () => {
      visaSdkMock.completeIdentityValidation.mockRejectedValue(
        new Error("Invalid OTP")
      );
      await expect(
        adapter.validateIdentity({ code: "000000" })
      ).rejects.toThrow("Invalid OTP");
    });
  });

  describe("getSrcProfile", () => {
    it("returns the profile response from the sdk", async () => {
      const mockProfile: GetSrcProfileResponse = {
        profiles: [],
      };
      visaSdkMock.getSrcProfile.mockResolvedValue(mockProfile);

      const result = await adapter.getSrcProfile(["id-token-123"]);

      expect(result).toEqual(mockProfile);
      expect(visaSdkMock.getSrcProfile).toHaveBeenCalledWith({
        idTokens: ["id-token-123"],
      });
    });

    it("defaults to empty idTokens array when none provided", async () => {
      await adapter.getSrcProfile();
      expect(visaSdkMock.getSrcProfile).toHaveBeenCalledWith({ idTokens: [] });
    });
  });

  describe("checkout", () => {
    it("builds request via buildCheckoutRequest and passes it to sdk", async () => {
      const { buildCheckoutRequest } = require("./utils");
      const mockRequest = { srcDigitalCardId: "card-456", idToken: "tok" };
      buildCheckoutRequest.mockResolvedValueOnce(mockRequest);

      const result = await adapter.checkout(
        { srcDigitalCardId: "card-456", network: "visa" },
        makeContext()
      );

      expect(buildCheckoutRequest).toHaveBeenCalledWith(
        { srcDigitalCardId: "card-456", network: "visa" },
        makeContext()
      );
      expect(visaSdkMock.checkout).toHaveBeenCalledWith(mockRequest);
      expect(result.dcfActionCode).toBe("COMPLETE");
    });

    it("throws when buildCheckoutRequest rejects", async () => {
      const { buildCheckoutRequest } = require("./utils");
      buildCheckoutRequest.mockRejectedValueOnce(
        new Error("Missing onboard data")
      );
      await expect(
        adapter.checkout({ network: "visa" }, makeContext())
      ).rejects.toThrow("Missing onboard data");
    });
  });

  describe("unbind", () => {
    it("calls sdk.unbindAppInstance with the provided idToken", async () => {
      await adapter.unbind({ idToken: "id-token-123" });
      expect(visaSdkMock.unbindAppInstance).toHaveBeenCalledWith({
        idToken: "id-token-123",
      });
    });

    it("passes undefined idToken when not provided", async () => {
      await adapter.unbind({});
      expect(visaSdkMock.unbindAppInstance).toHaveBeenCalledWith({
        idToken: undefined,
      });
    });
  });
});
