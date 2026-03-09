import type {
  AuthPayload,
  AuthSession,
  BillingLinkResponse,
} from "./types";

const AUTH_TOKEN_KEY = "vocaltype.auth.token";

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
    const data = (await response.json()) as { error?: string; message?: string };
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
    throw new Error(await parseError(response));
  }

  return (await response.json()) as T;
}

export const authClient = {
  tokenKey: AUTH_TOKEN_KEY,
  getStoredToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },
  setStoredToken(token: string) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  },
  clearStoredToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },
  async login(payload: AuthPayload) {
    return request<AuthSession>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      undefined,
    );
  },
  async register(payload: AuthPayload) {
    return request<AuthSession>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      undefined,
    );
  },
  async getSession(token: string) {
    return request<AuthSession>("/auth/session", { method: "GET" }, token);
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
};
