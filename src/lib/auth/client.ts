import type {
  AuthPayload,
  AuthSession,
  BillingLinkResponse,
  ChangePasswordPayload,
  ResetPasswordPayload,
} from "./types";
import { load } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";

const AUTH_TOKEN_KEY = "vocaltype.auth.token";
const AUTH_SESSION_KEY = "vocaltype.auth.session";
const DEVICE_ID_KEY = "vocaltype.device.id";
const DEVICE_REGISTERED_KEY = "vocaltype.device.registered";
// Stores the set of emails that have already been registered on this device.
const REGISTERED_EMAILS_KEY = "vocaltype.device.registered_emails";
const AUTH_STORE_FILE = "auth.store.json";

let cachedToken: string | null = null;
let cachedSession: AuthSession | null = null;
let cachedDeviceId: string | null = null;
let cachedRegisteredEmails: string[] | null = null;
let hasHydratedToken = false;
let storePromise: ReturnType<typeof load> | null = null;

const getSecureAuthToken = () => invoke<string | null>("get_secure_auth_token");
const setSecureAuthToken = (token: string) =>
  invoke<void>("set_secure_auth_token", { token });
const clearSecureAuthToken = () => invoke<void>("clear_secure_auth_token");
const getSecureAuthSession = () => invoke<string | null>("get_secure_auth_session");
const setSecureAuthSession = (sessionJson: string) =>
  invoke<void>("set_secure_auth_session", { sessionJson });
const clearSecureAuthSession = () => invoke<void>("clear_secure_auth_session");

export class AuthApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

const getAuthStore = () => {
  if (!storePromise) {
    storePromise = load(AUTH_STORE_FILE, {
      autoSave: false,
      defaults: {},
    });
  }

  return storePromise;
};

const readLegacyLocalToken = () => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

const readLegacyLocalSession = () => {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

const clearLegacyLocalAuth = () => {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    // Ignore localStorage access failures in non-browser contexts.
  }
};

const getApiBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_AUTH_API_URL?.trim();
  if (!baseUrl) {
    throw new Error("Missing VITE_AUTH_API_URL");
  }
  return baseUrl.replace(/\/+$/, "");
};

const buildHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseError = async (response: Response) => {
  try {
    const data = (await response.json()) as {
      error?: string;
      message?: string;
    };
    return data.error || data.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...buildHeaders(token),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new AuthApiError(await parseError(response), response.status);
  }

  return (await response.json()) as T;
}

export const authClient = {
  tokenKey: AUTH_TOKEN_KEY,

  // ─── Device ID ──────────────────────────────────────────────────────────────

  async getOrCreateDeviceId(): Promise<string> {
    if (cachedDeviceId) return cachedDeviceId;

    try {
      const store = await getAuthStore();
      const stored = await store.get<string>(DEVICE_ID_KEY);
      if (typeof stored === "string" && stored.trim()) {
        cachedDeviceId = stored;
        return cachedDeviceId;
      }
    } catch {
      // fall through to generate
    }

    // Generate a new UUID for this device and persist it
    const newId = crypto.randomUUID();
    cachedDeviceId = newId;

    try {
      const store = await getAuthStore();
      await store.set(DEVICE_ID_KEY, newId);
      await store.save();
    } catch (error) {
      console.warn("Failed to persist device ID:", error);
    }

    return newId;
  },

  async isDeviceRegistered(): Promise<boolean> {
    try {
      const store = await getAuthStore();
      const registered = await store.get<boolean>(DEVICE_REGISTERED_KEY);
      return registered === true;
    } catch {
      return false;
    }
  },

  async markDeviceRegistered(): Promise<void> {
    try {
      const store = await getAuthStore();
      await store.set(DEVICE_REGISTERED_KEY, true);
      await store.save();
    } catch (error) {
      console.warn("Failed to mark device as registered:", error);
    }
  },

  async clearDeviceRegistration(): Promise<void> {
    try {
      const store = await getAuthStore();
      await store.delete(DEVICE_REGISTERED_KEY);
      await store.save();
    } catch (error) {
      console.warn("Failed to clear device registration:", error);
    }
  },

  /** Returns the list of emails already registered on this device. */
  async getRegisteredEmails(): Promise<string[]> {
    if (cachedRegisteredEmails !== null) return cachedRegisteredEmails;
    try {
      const store = await getAuthStore();
      const stored = await store.get<string[]>(REGISTERED_EMAILS_KEY);
      cachedRegisteredEmails = Array.isArray(stored) ? stored : [];
    } catch {
      cachedRegisteredEmails = [];
    }
    return cachedRegisteredEmails;
  },

  /** Returns true if this exact email was used to register on this device before. */
  async isEmailRegisteredOnDevice(email: string): Promise<boolean> {
    const emails = await authClient.getRegisteredEmails();
    return emails.includes(email.trim().toLowerCase());
  },

  /** Saves an email to the device's registered email list. */
  async addRegisteredEmail(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const emails = await authClient.getRegisteredEmails();
    if (!emails.includes(normalized)) {
      const updated = [...emails, normalized];
      cachedRegisteredEmails = updated;
      try {
        const store = await getAuthStore();
        await store.set(REGISTERED_EMAILS_KEY, updated);
        await store.save();
      } catch (error) {
        console.warn("Failed to persist registered emails:", error);
      }
    }
  },

  // ─── Token & Session ────────────────────────────────────────────────────────

  async hydrateStoredToken() {
    if (hasHydratedToken) {
      return cachedToken;
    }

    const legacyToken = readLegacyLocalToken();

    try {
      const store = await getAuthStore();
      const storedToken = await store.get<string>(AUTH_TOKEN_KEY);
      const secureToken = await getSecureAuthToken();
      const resolvedToken =
        typeof secureToken === "string" && secureToken.trim()
          ? secureToken
          : typeof storedToken === "string" && storedToken.trim()
            ? storedToken
            : legacyToken;

      cachedToken = resolvedToken ?? null;

      if (resolvedToken) {
        await setSecureAuthToken(resolvedToken);
      }

      await store.delete(AUTH_TOKEN_KEY);
      await store.save();
      clearLegacyLocalAuth();
    } catch (error) {
      console.warn(
        "Failed to hydrate auth token from persistent store:",
        error,
      );
      cachedToken = legacyToken;
    }

    hasHydratedToken = true;
    return cachedToken;
  },

  async hydrateStoredSession() {
    await this.hydrateStoredToken();

    const legacySession = readLegacyLocalSession();

    try {
      const store = await getAuthStore();
      const storedSession = await store.get<AuthSession>(AUTH_SESSION_KEY);
      const secureSessionRaw = await getSecureAuthSession();
      const secureSession = secureSessionRaw
        ? (JSON.parse(secureSessionRaw) as AuthSession)
        : null;
      const resolvedSession = secureSession ?? storedSession ?? legacySession;

      cachedSession = resolvedSession ?? null;

      if (resolvedSession) {
        await setSecureAuthSession(JSON.stringify(resolvedSession));
      }

      await store.delete(AUTH_SESSION_KEY);
      await store.save();
      clearLegacyLocalAuth();
    } catch (error) {
      console.warn(
        "Failed to hydrate auth session from persistent store:",
        error,
      );
      cachedSession = legacySession;
    }

    return cachedSession;
  },

  getStoredToken() {
    return cachedToken;
  },

  getStoredSession() {
    return cachedSession;
  },

  async setStoredSession(session: AuthSession) {
    cachedSession = session;
    await this.setStoredToken(session.token);

    try {
      await setSecureAuthSession(JSON.stringify(session));
      const store = await getAuthStore();
      await store.delete(AUTH_SESSION_KEY);
      await store.save();
    } catch (error) {
      console.warn("Failed to persist auth session:", error);
    }
  },

  async setStoredToken(token: string) {
    cachedToken = token;
    hasHydratedToken = true;
    clearLegacyLocalAuth();

    try {
      await setSecureAuthToken(token);
      const store = await getAuthStore();
      await store.delete(AUTH_TOKEN_KEY);
      await store.save();
    } catch (error) {
      console.warn("Failed to persist auth token:", error);
    }
  },

  async clearStoredSession() {
    cachedSession = null;
    clearLegacyLocalAuth();
    await this.clearStoredToken();

    try {
      await clearSecureAuthSession();
      const store = await getAuthStore();
      await store.delete(AUTH_SESSION_KEY);
      await store.save();
    } catch (error) {
      console.warn("Failed to clear persisted auth session:", error);
    }
  },

  async clearStoredToken() {
    cachedToken = null;
    hasHydratedToken = true;
    clearLegacyLocalAuth();

    try {
      await clearSecureAuthToken();
      const store = await getAuthStore();
      await store.delete(AUTH_TOKEN_KEY);
      await store.save();
    } catch (error) {
      console.warn("Failed to clear persisted auth token:", error);
    }
  },

  getErrorStatus(error: unknown) {
    return error instanceof AuthApiError ? error.status : null;
  },

  // ─── API Calls ──────────────────────────────────────────────────────────────

  async login(payload: AuthPayload) {
    const device_id = await authClient.getOrCreateDeviceId();
    return request<AuthSession>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ ...payload, device_id }),
      },
      undefined,
    );
  },

  async register(payload: AuthPayload) {
    const device_id = await authClient.getOrCreateDeviceId();
    const session = await request<AuthSession>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ ...payload, device_id }),
      },
      undefined,
    );
    // After a successful registration, remember this device and email locally
    await authClient.markDeviceRegistered();
    await authClient.addRegisteredEmail(payload.email);
    return session;
  },

  async getSession(token: string) {
    const session = await request<AuthSession>(
      "/auth/session",
      { method: "GET" },
      token,
    );
    // If the backend returns a refreshed token, persist it automatically
    if (session.token && session.token !== token) {
      await authClient.setStoredToken(session.token);
    }
    return session;
  },

  async createCheckout(token: string) {
    return request<BillingLinkResponse>(
      "/billing/checkout",
      { method: "POST" },
      token,
    );
  },

  async createPortal(token: string) {
    return request<BillingLinkResponse>(
      "/billing/portal",
      { method: "POST" },
      token,
    );
  },

  async forgotPassword(email: string): Promise<void> {
    await request<{ ok: boolean }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async verifyResetCode(email: string, code: string): Promise<boolean> {
    const result = await request<{ valid: boolean }>(
      "/auth/verify-reset-code",
      {
        method: "POST",
        body: JSON.stringify({ email, code }),
      },
    );
    return result.valid;
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<AuthSession> {
    return request<AuthSession>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async changePassword(
    token: string,
    payload: ChangePasswordPayload,
  ): Promise<void> {
    await request<{ ok: boolean }>(
      "/auth/change-password",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token,
    );
  },
};
