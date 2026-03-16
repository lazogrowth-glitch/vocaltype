declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke?: unknown;
      transformCallback?: unknown;
    };
  }
}

const POLL_INTERVAL_MS = 50;
const DEFAULT_TIMEOUT_MS = 2000;

export const hasTauriRuntime = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(
    window.__TAURI_INTERNALS__?.invoke &&
      window.__TAURI_INTERNALS__?.transformCallback,
  );
};

export const waitForTauriRuntime = async (
  timeoutMs = DEFAULT_TIMEOUT_MS,
) => {
  if (hasTauriRuntime()) {
    return true;
  }

  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    if (hasTauriRuntime()) {
      return true;
    }
  }

  return hasTauriRuntime();
};
