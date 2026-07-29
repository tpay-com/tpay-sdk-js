import { Stage } from "../../../types/internal";
import { loadScript } from "../../../utils";
import {
  MASTERCARD_SDK_SANDBOX_URL,
  MASTERCARD_SDK_URL,
  TIMEOUT_DURATION,
} from "../config";

export function loadSDK(stage: Stage): Promise<void> {
  const isSandbox = stage === "sandbox";

  return loadScript({
    src: isSandbox ? MASTERCARD_SDK_SANDBOX_URL : MASTERCARD_SDK_URL,
    id: "mastercard-c2p-sdk",
    timeout: TIMEOUT_DURATION,
  });
}
