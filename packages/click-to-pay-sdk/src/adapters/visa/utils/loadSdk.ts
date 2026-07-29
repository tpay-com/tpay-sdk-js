import { Stage } from "../../../types/internal";
import { loadScript } from "../../../utils";
import {
  TIMEOUT_DURATION,
  VISA_SDK_SANDBOX_URL,
  VISA_SDK_URL,
} from "../config";

export function loadSDK(stage: Stage): Promise<void> {
  const isSandbox = stage === "sandbox";

  return loadScript({
    src: isSandbox ? VISA_SDK_SANDBOX_URL : VISA_SDK_URL,
    id: "visa-c2p-sdk",
    timeout: TIMEOUT_DURATION,
  });
}
