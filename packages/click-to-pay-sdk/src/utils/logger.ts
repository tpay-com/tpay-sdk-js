const LOGGING_ENABLED_KEY = "c2p:loggingEnabled";
const PREFIX = "[LOGGER]";

class ConsoleLogger {
  private isLoggingEnabled: boolean;

  constructor() {
    if (this.isLocalStorageAvailable()) {
      const storedValue = localStorage.getItem(LOGGING_ENABLED_KEY);
      this.isLoggingEnabled = storedValue === "true";
    } else {
      this.isLoggingEnabled = false;
    }
  }

  private isLocalStorageAvailable(): boolean {
    try {
      return (
        typeof localStorage !== "undefined" &&
        typeof localStorage.getItem === "function"
      );
    } catch (e) {
      return false;
    }
  }

  enableLogging() {
    this.isLoggingEnabled = true;
    if (this.isLocalStorageAvailable()) {
      localStorage.setItem(LOGGING_ENABLED_KEY, "true");
    }
  }

  disableLogging() {
    this.isLoggingEnabled = false;
    if (this.isLocalStorageAvailable()) {
      localStorage.setItem(LOGGING_ENABLED_KEY, "false");
    }
  }

  getLoggingStatus() {
    return this.isLoggingEnabled;
  }

  private logMessage(
    method: "log" | "debug" | "info" | "warn" | "error",
    ...args: unknown[]
  ) {
    if (this.isLoggingEnabled) {
      console[method](PREFIX, ...args);
    }
  }

  log(...args: unknown[]) {
    this.logMessage("log", ...args);
  }

  debug(...args: unknown[]) {
    this.logMessage("debug", ...args);
  }

  info(...args: unknown[]) {
    this.logMessage("info", ...args);
  }

  warn(...args: unknown[]) {
    this.logMessage("warn", ...args);
  }

  error(...args: unknown[]) {
    this.logMessage("error", ...args);
  }
}

export const logger = new ConsoleLogger();

// Expose logging controls on window.C2P so developers can toggle from the browser console:
//   window.C2P.enableLogging()
//   window.C2P.disableLogging()
if (typeof window !== "undefined") {
  (window as typeof window & { C2P?: unknown }).C2P = {
    enableLogging: () => logger.enableLogging(),
    disableLogging: () => logger.disableLogging(),
  };
}
