const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Window globals

if (typeof (global as any).window === "undefined") {
  (global as any).window = {};
}

(global as any).window.ENV = (global as any).window.ENV || {};
(global as any).window.vAdapters = (global as any).window.vAdapters || {};

// Mastercard SDK mock

export const mastercardSdkMock = {
  init: jest.fn().mockResolvedValue(undefined),
  isRecognized: jest
    .fn()
    .mockResolvedValue({ recognized: false, idTokens: [] }),
  getSrcProfile: jest.fn().mockResolvedValue({ profiles: [] }),
  identityLookup: jest.fn().mockResolvedValue({ consumerPresent: false }),
  initiateIdentityValidation: jest.fn().mockResolvedValue({
    maskedValidationChannel: "t***@example.com",
    supportedValidationChannels: [],
  }),
  completeIdentityValidation: jest.fn().mockResolvedValue({
    idToken: "mock-id-token",
    recognitionToken: "mock-recognition-token",
  }),
  enrollCard: jest.fn().mockResolvedValue({ maskedCard: {} }),
  checkout: jest.fn().mockResolvedValue({ dcfActionCode: "COMPLETE" }),
  unbindAppInstance: jest
    .fn()
    .mockResolvedValue({ srcCorrelationId: "mock-correlation-id" }),
};

(global as any).window.SRCSDK_MASTERCARD = mastercardSdkMock;

// Visa SDK mock

export const visaSdkMock = {
  init: jest.fn().mockResolvedValue(undefined),
  isRecognized: jest
    .fn()
    .mockResolvedValue({ recognized: false, idTokens: [] }),
  getSrcProfile: jest.fn().mockResolvedValue({ profiles: [] }),
  identityLookup: jest.fn().mockResolvedValue({ consumerPresent: false }),
  initiateIdentityValidation: jest.fn().mockResolvedValue({
    maskedValidationChannel: "t***@example.com",
  }),
  completeIdentityValidation: jest.fn().mockResolvedValue({
    idToken: "mock-id-token",
  }),
  checkout: jest.fn().mockResolvedValue({ dcfActionCode: "COMPLETE" }),
  unbindAppInstance: jest.fn().mockResolvedValue(undefined),
};

(global as any).window.vAdapters.VisaSRCI = jest.fn(() => visaSdkMock);
(global as any).window.SRCSDK_VISA = visaSdkMock;
