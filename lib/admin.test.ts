import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));

import { isAdmin, requireAdmin } from "./admin";

describe("isAdmin", () => {
  it("n'accepte que le rôle admin dans app_metadata", () => {
    expect(isAdmin({ app_metadata: { role: "admin" } })).toBe(true);
    expect(isAdmin({ app_metadata: { role: "user" } })).toBe(false);
    expect(isAdmin({ app_metadata: {} })).toBe(false);
  });
  it("ignore les valeurs absentes", () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});

describe("requireAdmin", () => {
  it("renvoie un 404 sans session", async () => {
    await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
  });
});
