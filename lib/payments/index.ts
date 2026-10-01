import { MockProvider } from "./mock";
import { PayDunyaProvider, paydunyaConfigured } from "./paydunya";
import type { PaymentProvider } from "./provider";

export type ProviderResult = { provider: PaymentProvider } | { error: "not_configured" };

/** Le mock n'est jamais utilisable en production, même si la variable est présente. */
export function getProvider(): ProviderResult {
  if (process.env.PAYMENTS_MOCK === "1" && process.env.NODE_ENV !== "production") return { provider: new MockProvider() };
  if (paydunyaConfigured()) return { provider: new PayDunyaProvider() };
  return { error: "not_configured" };
}

export function appUrl(request?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return request ? new URL(request.url).origin : "http://localhost:3000";
}
