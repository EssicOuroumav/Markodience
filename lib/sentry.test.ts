import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { scrubEvent } from "./sentry";

describe("scrubEvent", () => {
  it("retire cookies, en-têtes, corps et e-mails", () => {
    const e = {
      type: undefined,
      message: "Erreur pour marie@exemple.com",
      request: { cookies: { a: "b" }, headers: { cookie: "x" }, data: { password: "x" }, query_string: "token=1", url: "https://x/y" },
      user: { id: "u1", email: "marie@exemple.com", ip_address: "1.2.3.4" },
      exception: { values: [{ value: "échec pour a.b@c.org" }] },
    } as unknown as ErrorEvent;
    const out = scrubEvent(e);
    expect(out.request?.cookies).toBeUndefined();
    expect(out.request?.headers).toBeUndefined();
    expect(out.request?.data).toBeUndefined();
    expect(out.request?.query_string).toBeUndefined();
    expect(out.user).toEqual({ id: "u1" });
    expect(out.message).not.toContain("@");
    expect(out.exception?.values?.[0].value).toBe("échec pour [e-mail]");
  });
});
