import type { Network, OnboardData } from "../types/internal";
import { NetworkAdapter } from "./interface";

export class NetworkAdapterProvider {
  private adapters: Map<Network, NetworkAdapter> = new Map();

  register(adapter: NetworkAdapter) {
    this.adapters.set(adapter.network, adapter);
  }

  get(network: Network): NetworkAdapter {
    const adapter = this.adapters.get(network);
    if (!adapter) throw new Error(`Adapter not registered: ${network}`);
    return adapter;
  }

  getAll(): NetworkAdapter[] {
    return [...this.adapters.values()];
  }

  getEnabled(onboardData: OnboardData): NetworkAdapter[] {
    return this.getAll().filter((a) => a.isEnabled(onboardData));
  }
}
