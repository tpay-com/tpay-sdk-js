# @tpay-com/click-to-pay-sdk

This SDK provides a convenient way to integrate with the Tpay Click to Pay service in your JavaScript/TypeScript application. It supports Click to Pay (Mastercard SRC / Visa SRC) through a modular architecture based on the Adapter pattern, enabling easy extension for new payment networks.

## Architecture

The SDK uses a modular architecture to ensure maintainability and extensibility:

- **Orchestrator**: The main class (exported as `ClickToPay`) that orchestrates the initialization flow: SDK loading → provider initialization → user recognition → identity lookup. It handles graceful degradation if one network fails.
- **NetworkAdapterProvider**: A registry for payment network adapters. Registers and provides access to adapters for Mastercard, Visa, etc.
- **NetworkAdapter**: A common interface implemented by each payment network (e.g., MastercardAdapter, VisaAdapter). Defines methods like `loadSdk`, `init`, `recognize`, `identityLookup`, `checkout`, etc.
- **BaseNetworkAdapter**: A base class providing shared logic for SDK loading and management.

This design allows adding new payment networks by implementing the `NetworkAdapter` interface and registering the adapter, without modifying core logic.

## Requirements

- **Node.js:** `>=20`
- **npm:** `>=10` (or the version of npm bundled with Node.js 20)

## Installation

Install the package using npm:

```sh
npm install @tpay-com/click-to-pay-sdk
```

## Usage

To start using the SDK, you need to import the `ClickToPay` class (which is an alias for the `Orchestrator`), create an instance with your configuration and required hooks, and then initialize it.

### Hooks

The SDK requires two hooks for integration:

- **`onboardFn`**: A function to fetch user onboard data (e.g., recognition tokens) based on email/phone. This is called during initialization.
- **`saveRecognitionTokenFn`** (optional): A function to save recognition tokens after successful validation, allowing future recognitions without OTP.
- **`encryptCardFn`** (optional): A function to encrypt card data before checkout, used when enrolling a new card. It is automatically skipped if `srcDigitalCardId` is provided in the checkout input (i.e. when paying with a saved card).

```typescript
import { ClickToPay } from "@tpay-com/click-to-pay-sdk";

// Configuration for the Click to Pay service
const config = {
  transactionId: "YOUR_MERCHANT_ID_GOES_HERE",
  stage: "sandbox",
  locale: "pl_PL",
  currency: "PLN",
  amount: 1011, // minor units (e.g. 1011 = 10.11 PLN)
  phone: "123123123",
  email: "example@mail.com",
};

// Define hooks
const hooks = {
  onboardFn: async ({ email, phone }: { email?: string; phone?: string }) => {
    // Implement logic to fetch onboard data from your backend or storage
    // Example: Call your API to get recognition tokens for the user
    const response = await fetch("/api/onboard", {
      method: "POST",
      body: JSON.stringify({ email, phone }),
    });
    return await response.json(); // Should return OnboardData object
  },
  saveRecognitionTokenFn: async ({
    network,
    recognitionToken,
  }: {
    network: string;
    recognitionToken: string;
  }) => {
    // Implement logic to save the recognition token for future use
    // Example: Store in localStorage or send to your backend
    localStorage.setItem(`recognitionToken_${network}`, recognitionToken);
  },
};

const c2p = new ClickToPay(config, hooks);

// Optional: Set encryptCardFn if you plan to save a card during checkout
c2p.encryptCardFn = async () => {
  // Implement logic to encrypt card data
  // Example: Call your backend to encrypt the card
  const response = await fetch("/api/encrypt-card", {
    method: "POST",
    body: JSON.stringify({
      /* card data */
    }),
  });
  return await response.text(); // Should return encrypted card data as string
};

async function initialize() {
  try {
    const initializationResponse = await c2p.init();
    console.log(
      "Click to Pay initialized successfully:",
      initializationResponse
    );
    // You can now use the initializationResponse data
  } catch (error) {
    console.error("Failed to initialize Click to Pay:", error);
  }
}

initialize();
```

### Initialization Flow

The `init()` method follows these steps:

1. **Onboard**: Fetch user data (email, phone) and recognition tokens.
2. **Load SDKs**: Load SDKs for enabled networks (Mastercard, Visa) in parallel.
3. **Initialize Providers**: Initialize each network adapter.
4. **Recognize User**: Check if the user is recognized via stored tokens.
5. **Identity Lookup**: If not recognized, perform identity lookup across networks.

The SDK handles failures gracefully — if one network fails, others continue to work.
