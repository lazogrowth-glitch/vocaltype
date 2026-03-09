export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "inactive";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface SubscriptionAccess {
  status: SubscriptionStatus;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
  has_access: boolean;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  subscription: SubscriptionAccess;
}

export interface AuthPayload {
  email: string;
  password: string;
  name?: string;
}

export interface BillingLinkResponse {
  url: string;
}
