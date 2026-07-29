import { Network, OnboardData, Stage } from "../types/internal";

export abstract class BaseNetworkAdapter<TSdk> {
  abstract readonly network: Network;

  protected sdk?: TSdk;
  protected sdkIsLoaded = false;
  protected loadSdkPromise?: Promise<void>;

  protected getSdkOrThrow(): TSdk {
    if (!this.sdk) {
      throw new Error(
        `${this.network} SDK is not loaded. Call loadSdk() first.`
      );
    }

    return this.sdk;
  }

  abstract isEnabled(onboardData: OnboardData): boolean;

  async loadSdk(stage: Stage): Promise<void> {
    if (this.sdkIsLoaded) return;
    if (this.loadSdkPromise) return this.loadSdkPromise;

    this.loadSdkPromise = this.performLoadSdk(stage)
      .then(() => {
        this.sdkIsLoaded = true;
      })
      .catch((error) => {
        this.loadSdkPromise = undefined;
        throw error;
      });

    return this.loadSdkPromise;
  }

  protected abstract performLoadSdk(stage: Stage): Promise<void>;
}
