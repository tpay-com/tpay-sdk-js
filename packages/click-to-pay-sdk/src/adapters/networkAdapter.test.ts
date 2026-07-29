import { makeOnboardData } from "../testUtils";
import { NetworkAdapter } from "./interface";
import { NetworkAdapterProvider } from "./networkAdapter";

const makeAdapter = (
  network: "mastercard" | "visa",
  isEnabled = true
): jest.Mocked<NetworkAdapter> =>
  ({
    network,
    isEnabled: jest.fn().mockReturnValue(isEnabled),
    loadSdk: jest.fn().mockResolvedValue(undefined),
    init: jest.fn().mockResolvedValue(undefined),
    recognize: jest.fn(),
    identityLookup: jest.fn(),
    initiateValidation: jest.fn(),
    validateIdentity: jest.fn(),
    getSrcProfile: jest.fn(),
    checkout: jest.fn(),
    unbind: jest.fn(),
  }) as jest.Mocked<NetworkAdapter>;

describe("NetworkAdapterProvider", () => {
  let provider: NetworkAdapterProvider;

  beforeEach(() => {
    provider = new NetworkAdapterProvider();
  });

  describe("register / get", () => {
    it("should register an adapter and retrieve it by network", () => {
      const adapter = makeAdapter("mastercard");
      provider.register(adapter);

      expect(provider.get("mastercard")).toBe(adapter);
    });

    it("should register both adapters and retrieve each independently", () => {
      const mcAdapter = makeAdapter("mastercard");
      const visaAdapter = makeAdapter("visa");

      provider.register(mcAdapter);
      provider.register(visaAdapter);

      expect(provider.get("mastercard")).toBe(mcAdapter);
      expect(provider.get("visa")).toBe(visaAdapter);
    });

    it("should throw when requesting an unregistered network", () => {
      expect(() => provider.get("visa")).toThrow(
        "Adapter not registered: visa"
      );
    });

    it("should overwrite an existing adapter when registering the same network again", () => {
      const first = makeAdapter("mastercard");
      const second = makeAdapter("mastercard");

      provider.register(first);
      provider.register(second);

      expect(provider.get("mastercard")).toBe(second);
    });
  });

  describe("getAll", () => {
    it("should return an empty array when no adapters are registered", () => {
      expect(provider.getAll()).toEqual([]);
    });

    it("should return all registered adapters", () => {
      const mcAdapter = makeAdapter("mastercard");
      const visaAdapter = makeAdapter("visa");

      provider.register(mcAdapter);
      provider.register(visaAdapter);

      expect(provider.getAll()).toHaveLength(2);
      expect(provider.getAll()).toContain(mcAdapter);
      expect(provider.getAll()).toContain(visaAdapter);
    });
  });

  describe("getEnabled", () => {
    it("should return only adapters whose isEnabled returns true", () => {
      const mcAdapter = makeAdapter("mastercard", true);
      const visaAdapter = makeAdapter("visa", false);

      provider.register(mcAdapter);
      provider.register(visaAdapter);

      const onboardData = makeOnboardData({ visaInitObject: null });
      const enabled = provider.getEnabled(onboardData);

      expect(enabled).toContain(mcAdapter);
      expect(enabled).not.toContain(visaAdapter);
    });

    it("should return all adapters when all are enabled", () => {
      const mcAdapter = makeAdapter("mastercard", true);
      const visaAdapter = makeAdapter("visa", true);

      provider.register(mcAdapter);
      provider.register(visaAdapter);

      const enabled = provider.getEnabled(makeOnboardData());

      expect(enabled).toHaveLength(2);
    });

    it("should return empty array when no adapters are enabled", () => {
      const mcAdapter = makeAdapter("mastercard", false);
      const visaAdapter = makeAdapter("visa", false);

      provider.register(mcAdapter);
      provider.register(visaAdapter);

      const enabled = provider.getEnabled(makeOnboardData());

      expect(enabled).toHaveLength(0);
    });

    it("should call isEnabled with the provided onboardData for each adapter", () => {
      const mcAdapter = makeAdapter("mastercard");
      const visaAdapter = makeAdapter("visa");

      provider.register(mcAdapter);
      provider.register(visaAdapter);

      const onboardData = makeOnboardData();
      provider.getEnabled(onboardData);

      expect(mcAdapter.isEnabled).toHaveBeenCalledWith(onboardData);
      expect(visaAdapter.isEnabled).toHaveBeenCalledWith(onboardData);
    });

    it("should return empty array when no adapters are registered", () => {
      const enabled = provider.getEnabled(makeOnboardData());
      expect(enabled).toEqual([]);
    });
  });
});
