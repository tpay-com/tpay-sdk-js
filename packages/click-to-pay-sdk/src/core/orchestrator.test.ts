import { NetworkAdapter } from "../adapters/interface";
import { MastercardAdapter } from "../adapters/mastercard/mastercardSdkAdapter";
import { NetworkAdapterProvider } from "../adapters/networkAdapter";
import { makeConfig, makeOnboardData } from "../testUtils";
import { ClickToPayError } from "./errors";
import { Orchestrator } from "./orchestrator";

jest.mock("../adapters/networkAdapter");
jest.mock("../adapters/mastercard/mastercardSdkAdapter");
jest.mock("../adapters/visa/visaSdkAdapter");

const makeMockAdapter = (): jest.Mocked<NetworkAdapter> => ({
  network: "mastercard",
  isEnabled: jest.fn().mockReturnValue(true),
  loadSdk: jest.fn().mockResolvedValue(undefined),
  init: jest.fn().mockResolvedValue(undefined),
  recognize: jest
    .fn()
    .mockResolvedValue({ network: "mastercard", recognized: false }),
  identityLookup: jest
    .fn()
    .mockResolvedValue({ network: "mastercard", consumerPresent: false }),
  initiateValidation: jest.fn().mockResolvedValue({
    maskedValidationChannel: "t***@example.com",
    supportedValidationChannels: [],
  }),
  validateIdentity: jest.fn().mockResolvedValue({}),
  getSrcProfile: jest.fn().mockResolvedValue({ profiles: [] }),
  checkout: jest.fn().mockResolvedValue({ dcfActionCode: "COMPLETE" }),
  unbind: jest.fn().mockResolvedValue(undefined),
});

const makeMockProvider = (adapter: jest.Mocked<NetworkAdapter>) => ({
  register: jest.fn(),
  get: jest.fn().mockReturnValue(adapter),
  getAll: jest.fn().mockReturnValue([adapter]),
  getEnabled: jest.fn().mockReturnValue([adapter]),
});

describe("Orchestrator", () => {
  const onboardData = makeOnboardData();

  let orchestrator: Orchestrator;
  let adapterMock: jest.Mocked<NetworkAdapter>;
  let providerMock: ReturnType<typeof makeMockProvider>;
  let onboardFn: jest.Mock;
  let saveRecognitionTokenFn: jest.Mock;

  beforeEach(() => {
    adapterMock = makeMockAdapter();
    providerMock = makeMockProvider(adapterMock);
    onboardFn = jest.fn().mockResolvedValue(onboardData);
    saveRecognitionTokenFn = jest.fn().mockResolvedValue(undefined);

    (MastercardAdapter as jest.Mock).mockImplementation(() => adapterMock);

    (NetworkAdapterProvider as jest.Mock).mockImplementation(
      () => providerMock
    );

    orchestrator = new Orchestrator(makeConfig(), {
      onboardFn,
      saveRecognitionTokenFn,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("init()", () => {
    it("returns RECOGNIZED when a provider recognizes the user", async () => {
      onboardFn.mockResolvedValue(
        makeOnboardData({
          recognitionToken: { mastercard: "mc-token", visa: null },
        })
      );
      adapterMock.recognize.mockResolvedValue({
        network: "mastercard",
        recognized: true,
        idTokens: ["tok-abc"],
      });

      const result = await orchestrator.init();

      expect(result).toBe("RECOGNIZED");
      expect(orchestrator.activeNetwork).toBe("mastercard");
    });

    it("stores the first idToken as sharedIdToken after recognition", async () => {
      onboardFn.mockResolvedValue(
        makeOnboardData({
          recognitionToken: { mastercard: "mc-token", visa: null },
        })
      );
      adapterMock.recognize.mockResolvedValue({
        network: "mastercard",
        recognized: true,
        idTokens: ["tok-abc", "tok-def"],
      });

      await orchestrator.init();

      expect(orchestrator["sharedIdToken"]).toBe("tok-abc");
    });

    it("returns REQUIRES_OTP when recognition fails but identity lookup finds consumer", async () => {
      adapterMock.identityLookup.mockResolvedValue({
        network: "mastercard",
        consumerPresent: true,
      });

      const result = await orchestrator.init();

      expect(result).toBe("REQUIRES_OTP");
      expect(orchestrator.activeNetwork).toBe("mastercard");
    });

    it("returns NOT_RECOGNIZED when neither recognition nor lookup finds the consumer", async () => {
      const result = await orchestrator.init();

      expect(result).toBe("NOT_RECOGNIZED");
      expect(orchestrator.activeNetwork).toBeUndefined();
    });

    it("returns ALREADY_INITIALIZED on a second call without re-running the flow", async () => {
      adapterMock.recognize.mockResolvedValue({
        network: "mastercard",
        recognized: true,
        idTokens: [],
      });

      await orchestrator.init();
      const result = await orchestrator.init();

      expect(result).toBe("ALREADY_INITIALIZED");
      expect(onboardFn).toHaveBeenCalledTimes(1);
    });

    it("calls onboardFn with email and phone from config", async () => {
      adapterMock.recognize.mockResolvedValue({
        network: "mastercard",
        recognized: true,
        idTokens: [],
      });

      await orchestrator.init();

      expect(onboardFn).toHaveBeenCalledWith({
        email: makeConfig().email,
        phone: undefined,
      });
    });

    it("throws when no providers are enabled", async () => {
      providerMock.getEnabled.mockReturnValue([]);

      await expect(orchestrator.init()).rejects.toThrow(
        "Failed to load any network SDK. Check network availability and onboardData."
      );
    });

    it("throws when all providers fail to initialize", async () => {
      adapterMock.init.mockRejectedValue(new Error("init failed"));

      await expect(orchestrator.init()).rejects.toThrow(
        "Failed to initialize any network SDK. Check onboardData configuration."
      );
    });

    it("throws when all adapters fail to load SDK", async () => {
      adapterMock.loadSdk.mockRejectedValue(new Error("SDK load failed"));

      await expect(orchestrator.init()).rejects.toThrow(
        "Failed to load any network SDK. Check network availability and onboardData."
      );
    });

    describe("tryRecognize — stale browser-state guard", () => {
      it("skips adapter.recognize and returns not-recognized when onboard has no token for the network", async () => {
        // onboardData has recognitionToken: { mastercard: null, visa: null }
        // so tokens array will be empty — adapter must NOT be called
        adapterMock.identityLookup.mockResolvedValue({
          network: "mastercard",
          consumerPresent: true,
        });

        const result = await orchestrator.init();

        expect(adapterMock.recognize).not.toHaveBeenCalled();
        expect(result).toBe("REQUIRES_OTP");
      });

      it("calls adapter.recognize when onboard data contains a token for the network", async () => {
        onboardFn.mockResolvedValue(
          makeOnboardData({
            recognitionToken: { mastercard: "mc-token", visa: null },
          })
        );
        adapterMock.recognize.mockResolvedValue({
          network: "mastercard",
          recognized: true,
          idTokens: ["tok-xyz"],
        });

        const result = await orchestrator.init();

        expect(adapterMock.recognize).toHaveBeenCalledWith({
          recognitionTokens: ["mc-token"],
        });
        expect(result).toBe("RECOGNIZED");
      });

      it("does not use adapter browser storage when switching accounts (no token for new email)", async () => {
        // Simulate: previous user had a binding in adapter browser storage.
        // Adapter would return recognized:true if called — but it must NOT be
        // called because the new user has no recognition token.
        adapterMock.recognize.mockResolvedValue({
          network: "mastercard",
          recognized: true, // would be wrong user's cards
          idTokens: ["stale-tok"],
        });
        adapterMock.identityLookup.mockResolvedValue({
          network: "mastercard",
          consumerPresent: true,
        });

        // onboardData has no token (new/unknown user)
        const result = await orchestrator.init();

        expect(adapterMock.recognize).not.toHaveBeenCalled();
        expect(result).toBe("REQUIRES_OTP"); // correct: send OTP to new user
      });
    });
  });

  describe("initiateValidation()", () => {
    it("throws when the SDK has not been initialized", async () => {
      await expect(orchestrator.initiateValidation()).rejects.toThrow(
        "ClickToPay SDK is not initialized. Call init() first."
      );
    });

    it("throws when no active network has been selected", async () => {
      orchestrator["initialized"] = true;

      await expect(orchestrator.initiateValidation()).rejects.toThrow(
        "No active network. Call init() first."
      );
    });

    it("delegates to the active adapter with the provided channelId", async () => {
      orchestrator["initialized"] = true;
      orchestrator["activeNetwork"] = "mastercard";

      await orchestrator.initiateValidation("EMAIL_ADDRESS");

      expect(adapterMock.initiateValidation).toHaveBeenCalledWith(
        "EMAIL_ADDRESS"
      );
    });

    it("calls initiateValidation with undefined when no channelId is provided", async () => {
      orchestrator["initialized"] = true;
      orchestrator["activeNetwork"] = "mastercard";

      await orchestrator.initiateValidation();

      expect(adapterMock.initiateValidation).toHaveBeenCalledWith(undefined);
    });

    it("normalizes a RETRIES_EXCEEDED SRC rejection into OTP_RETRIES_EXCEEDED", async () => {
      orchestrator["initialized"] = true;
      orchestrator["activeNetwork"] = "mastercard";
      adapterMock.initiateValidation.mockRejectedValue({
        reason: "RETRIES_EXCEEDED",
      });

      const err = await orchestrator.initiateValidation().catch((e) => e);

      expect(err).toBeInstanceOf(ClickToPayError);
      expect((err as ClickToPayError).code).toBe("OTP_RETRIES_EXCEEDED");
    });
  });

  describe("validateIdentity()", () => {
    beforeEach(() => {
      orchestrator["initialized"] = true;
      orchestrator["activeNetwork"] = "mastercard";
      orchestrator["onboardData"] = onboardData;
      adapterMock.validateIdentity.mockResolvedValue({
        idToken: "new-id-token",
        recognitionToken: "new-rec-token",
      });
    });

    it("throws when the SDK has not been initialized", async () => {
      orchestrator["initialized"] = false;

      await expect(
        orchestrator.validateIdentity({ code: "123456" })
      ).rejects.toThrow(
        "ClickToPay SDK is not initialized. Call init() first."
      );
    });

    it("updates sharedIdToken when the adapter returns an idToken", async () => {
      await orchestrator.validateIdentity({ code: "123456" });

      expect(orchestrator["sharedIdToken"]).toBe("new-id-token");
    });

    it("calls saveRecognitionTokenFn when saveDevice is true and a recognitionToken is returned", async () => {
      await orchestrator.validateIdentity({ code: "123456", saveDevice: true });

      expect(saveRecognitionTokenFn).toHaveBeenCalledWith({
        network: "mastercard",
        recognitionToken: "new-rec-token",
        email: makeConfig().email,
        phone: undefined,
      });
    });

    it("does not call saveRecognitionTokenFn when saveDevice is false", async () => {
      await orchestrator.validateIdentity({
        code: "123456",
        saveDevice: false,
      });

      expect(saveRecognitionTokenFn).not.toHaveBeenCalled();
    });

    it("does not call saveRecognitionTokenFn when adapter returns no recognitionToken", async () => {
      adapterMock.validateIdentity.mockResolvedValue({
        idToken: "new-id-token",
      });

      await orchestrator.validateIdentity({ code: "123456", saveDevice: true });

      expect(saveRecognitionTokenFn).not.toHaveBeenCalled();
    });

    it("normalizes a CODE_INVALID SRC rejection into INVALID_OTP", async () => {
      adapterMock.validateIdentity.mockRejectedValue({
        reason: "CODE_INVALID",
      });

      const err = await orchestrator
        .validateIdentity({ code: "000000" })
        .catch((e) => e);

      expect(err).toBeInstanceOf(ClickToPayError);
      expect((err as ClickToPayError).code).toBe("INVALID_OTP");
      expect((err as ClickToPayError).networkReason).toBe("CODE_INVALID");
      expect((err as ClickToPayError).network).toBe("mastercard");
    });

    it("normalizes an ACCT_INACCESSIBLE SRC rejection (locked account)", async () => {
      adapterMock.validateIdentity.mockRejectedValue({
        error: { reason: "ACCT_INACCESSIBLE" },
      });

      const err = await orchestrator
        .validateIdentity({ code: "123456" })
        .catch((e) => e);

      expect((err as ClickToPayError).code).toBe("ACCT_INACCESSIBLE");
    });

    it("falls back to NETWORK_ERROR when the rejection has no recognizable reason", async () => {
      const originalError = new Error("boom");
      adapterMock.validateIdentity.mockRejectedValue(originalError);

      const err = await orchestrator
        .validateIdentity({ code: "123456" })
        .catch((e) => e);

      expect((err as ClickToPayError).code).toBe("NETWORK_ERROR");
      expect((err as ClickToPayError).cause).toBe(originalError);
    });
  });

  describe("getCards()", () => {
    beforeEach(() => {
      orchestrator["initialized"] = true;
      orchestrator["onboardData"] = onboardData;
    });

    it("throws when the SDK has not been initialized", async () => {
      orchestrator["initialized"] = false;

      await expect(orchestrator.getCards()).rejects.toThrow(
        "ClickToPay SDK is not initialized. Call init() first."
      );
    });

    it("returns an empty array when onboardData is not set", async () => {
      orchestrator["onboardData"] = undefined as any;

      const cards = await orchestrator.getCards();

      expect(cards).toEqual([]);
    });

    it("returns an empty array when the adapter returns no profiles", async () => {
      adapterMock.getSrcProfile.mockResolvedValue({ profiles: [] });

      const cards = await orchestrator.getCards();

      expect(cards).toEqual([]);
    });

    it("maps and returns cards from the adapter profiles", async () => {
      adapterMock.getSrcProfile.mockResolvedValue({
        profiles: [
          {
            maskedCards: [
              {
                srcDigitalCardId: "card-123",
                srcPaymentCardId: "src-pay-123",
                panBin: "541333",
                panLastFour: "4321",
                panExpirationMonth: "12",
                panExpirationYear: "2026",
                paymentCardType: "CREDIT",
                dateOfCardCreated: "2023-01-01",
                digitalCardRelatedData: "",
                digitalCardData: {
                  status: "ACTIVE",
                  artUri: "https://example.com/art.png",
                  presentationName: "My Mastercard",
                  descriptorName: "Mastercard Gold",
                },
              },
            ],
            shippingAddresses: [],
          },
        ],
      });

      const cards = await orchestrator.getCards();

      expect(cards).toHaveLength(1);
      expect(cards[0]).toMatchObject({
        srcDigitalCardId: "card-123",
        panBin: "541333",
        panLastFour: "4321",
        network: "mastercard",
        status: "ACTIVE",
        descriptorName: "Mastercard Gold",
        artUri: "https://example.com/art.png",
      });
    });

    it("continues gracefully when getSrcProfile fails for an adapter", async () => {
      adapterMock.getSrcProfile.mockRejectedValue(
        new Error("Profile fetch failed")
      );

      const cards = await orchestrator.getCards();

      expect(cards).toEqual([]);
    });

    it("passes the sharedIdToken to getSrcProfile when available", async () => {
      orchestrator["sharedIdToken"] = "shared-tok";

      await orchestrator.getCards();

      expect(adapterMock.getSrcProfile).toHaveBeenCalledWith(["shared-tok"]);
    });

    it("calls getSrcProfile with undefined when no sharedIdToken is set", async () => {
      orchestrator["sharedIdToken"] = undefined;

      await orchestrator.getCards();

      expect(adapterMock.getSrcProfile).toHaveBeenCalledWith(undefined);
    });
  });

  describe("checkout()", () => {
    beforeEach(() => {
      orchestrator["initialized"] = true;
      orchestrator["onboardData"] = onboardData;
    });

    it("throws when the SDK has not been initialized", async () => {
      orchestrator["initialized"] = false;

      await expect(
        orchestrator.checkout({
          network: "mastercard",
          srcDigitalCardId: "card-123",
        })
      ).rejects.toThrow(
        "ClickToPay SDK is not initialized. Call init() first."
      );
    });

    it("delegates to the adapter returned by provider.get(network)", async () => {
      const result = await orchestrator.checkout({
        network: "mastercard",
        srcDigitalCardId: "card-123",
      });

      expect(providerMock.get).toHaveBeenCalledWith("mastercard");
      expect(adapterMock.checkout).toHaveBeenCalledTimes(1);
      expect(result.dcfActionCode).toBe("COMPLETE");
    });

    it("passes the current context to the adapter checkout", async () => {
      orchestrator["sharedIdToken"] = "shared-tok";

      await orchestrator.checkout({
        network: "mastercard",
        srcDigitalCardId: "card-123",
      });

      expect(adapterMock.checkout).toHaveBeenCalledWith(
        expect.objectContaining({ network: "mastercard" }),
        expect.objectContaining({
          config: expect.anything(),
          onboardData,
          sharedIdToken: "shared-tok",
        })
      );
    });

    it("normalizes a CARD_INVALID SRC rejection", async () => {
      adapterMock.checkout.mockRejectedValue({ reason: "CARD_INVALID" });

      const err = await orchestrator
        .checkout({ network: "mastercard", srcDigitalCardId: "card-123" })
        .catch((e) => e);

      expect(err).toBeInstanceOf(ClickToPayError);
      expect((err as ClickToPayError).code).toBe("CARD_INVALID");
      expect((err as ClickToPayError).network).toBe("mastercard");
    });
  });

  describe("unbindAppInstance()", () => {
    beforeEach(() => {
      orchestrator["initialized"] = true;
      orchestrator["activeNetwork"] = "mastercard";
      orchestrator["onboardData"] = onboardData;
    });

    it("throws when the SDK has not been initialized", async () => {
      orchestrator["initialized"] = false;

      await expect(orchestrator.unbindAppInstance()).rejects.toThrow(
        "ClickToPay SDK is not initialized. Call init() first."
      );
    });

    it("throws when no active network has been selected", async () => {
      orchestrator["activeNetwork"] = undefined;

      await expect(orchestrator.unbindAppInstance()).rejects.toThrow(
        "No active network. Call init() first."
      );
    });

    it("calls unbind on the active adapter", async () => {
      await orchestrator.unbindAppInstance();

      expect(adapterMock.unbind).toHaveBeenCalledTimes(1);
    });

    it("passes the current sharedIdToken to unbind", async () => {
      orchestrator["sharedIdToken"] = "shared-tok";

      await orchestrator.unbindAppInstance();

      expect(adapterMock.unbind).toHaveBeenCalledWith({
        idToken: "shared-tok",
      });
    });

    it("passes undefined idToken to unbind when no sharedIdToken is set", async () => {
      orchestrator["sharedIdToken"] = undefined;

      await orchestrator.unbindAppInstance();

      expect(adapterMock.unbind).toHaveBeenCalledWith({ idToken: undefined });
    });
  });

  describe("typed errors", () => {
    it("throws a ClickToPayError with code NOT_INITIALIZED before init()", async () => {
      const err = await orchestrator.initiateValidation().catch((e) => e);

      expect(err).toBeInstanceOf(ClickToPayError);
      expect((err as ClickToPayError).code).toBe("NOT_INITIALIZED");
    });

    it("tags an init load failure with code SDK_LOAD_FAILED", async () => {
      providerMock.getEnabled.mockReturnValue([]);

      const err = await orchestrator.init().catch((e) => e);

      expect(err).toBeInstanceOf(ClickToPayError);
      expect((err as ClickToPayError).code).toBe("SDK_LOAD_FAILED");
    });
  });

  describe("init() concurrency", () => {
    it("coalesces concurrent init() calls into a single flow", async () => {
      const [r1, r2] = await Promise.all([
        orchestrator.init(),
        orchestrator.init(),
      ]);

      expect(r1).toBe(r2);
      expect(onboardFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("dispose()", () => {
    it("unbinds the active adapter and blocks further use", async () => {
      orchestrator["initialized"] = true;
      orchestrator["activeNetwork"] = "mastercard";
      orchestrator["sharedIdToken"] = "tok";

      await orchestrator.dispose();

      expect(adapterMock.unbind).toHaveBeenCalledWith({ idToken: "tok" });

      const err = await orchestrator.initiateValidation().catch((e) => e);
      expect(err).toBeInstanceOf(ClickToPayError);
      expect((err as ClickToPayError).code).toBe("DISPOSED");
    });

    it("is idempotent and does not unbind twice", async () => {
      orchestrator["initialized"] = true;
      orchestrator["activeNetwork"] = "mastercard";

      await orchestrator.dispose();
      await orchestrator.dispose();

      expect(adapterMock.unbind).toHaveBeenCalledTimes(1);
    });

    it("completes teardown even when unbind rejects", async () => {
      orchestrator["initialized"] = true;
      orchestrator["activeNetwork"] = "mastercard";
      adapterMock.unbind.mockRejectedValueOnce(new Error("boom"));

      await expect(orchestrator.dispose()).resolves.toBeUndefined();

      const err = await orchestrator.getCards().catch((e) => e);
      expect((err as ClickToPayError).code).toBe("DISPOSED");
    });

    it("rejects init() after dispose() with code DISPOSED", async () => {
      await orchestrator.dispose();

      const err = await orchestrator.init().catch((e) => e);
      expect(err).toBeInstanceOf(ClickToPayError);
      expect((err as ClickToPayError).code).toBe("DISPOSED");
    });
  });
});
