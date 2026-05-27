import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import type { User } from "@prisma/client";
import { testDb } from "./db-helper";

/**
 * I-13 結合: RBAC ガード requireAdvisor / requireAdmin（AC-C2-1, SEC-2）.
 *
 * これらは Server Component の冒頭で実行され、ロール不一致/未認証では redirect する。
 * redirect を sentinel error にモックし、許可/拒否（リダイレクト先）を検証する。
 * 実 DB のユーザー（GENERAL/FORTUNE_TELLER/ADMIN）を使う read-only テスト。
 */

let currentUser: User | null = null;

vi.mock("@/lib/auth", () => ({
  getCurrentUser: async () => currentUser,
}));

class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

const { requireAdvisor, requireAdmin } = await import("@/lib/auth/rbac");

let general: User;
let advisor: User;
let admin: User;

beforeAll(async () => {
  general = await testDb.user.findFirstOrThrow({ where: { role: "GENERAL" } });
  advisor = await testDb.user.findFirstOrThrow({ where: { role: "FORTUNE_TELLER" } });
  admin = await testDb.user.findFirstOrThrow({ where: { role: "ADMIN" } });
});

afterEach(() => {
  currentUser = null;
});

/** ガードを実行し、リダイレクト先 URL（投げられた場合）または null（通過）を返す。 */
async function runGuard(
  guard: (returnTo: string) => Promise<User>,
  returnTo: string
): Promise<{ redirectedTo: string | null; user: User | null }> {
  try {
    const u = await guard(returnTo);
    return { redirectedTo: null, user: u };
  } catch (e) {
    if (e instanceof RedirectError) return { redirectedTo: e.url, user: null };
    throw e;
  }
}

describe("requireAdvisor (/advisor/* ガード)", () => {
  it("FORTUNE_TELLER は通過し User を返す", async () => {
    currentUser = advisor;
    const r = await runGuard(requireAdvisor, "/advisor");
    expect(r.redirectedTo).toBeNull();
    expect(r.user?.id).toBe(advisor.id);
  });

  it("ADMIN も通過（運営は占い師領域にアクセス可）", async () => {
    currentUser = admin;
    const r = await runGuard(requireAdvisor, "/advisor");
    expect(r.redirectedTo).toBeNull();
    expect(r.user?.id).toBe(admin.id);
  });

  it("GENERAL は /mypage へリダイレクト（拒否, SEC-2）", async () => {
    currentUser = general;
    const r = await runGuard(requireAdvisor, "/advisor");
    expect(r.redirectedTo).toBe("/mypage");
  });

  it("未認証は /login?returnTo=... へリダイレクト", async () => {
    currentUser = null;
    const r = await runGuard(requireAdvisor, "/advisor/requests");
    expect(r.redirectedTo).toContain("/login?returnTo=");
    expect(r.redirectedTo).toContain(encodeURIComponent("/advisor/requests"));
  });
});

describe("requireAdmin (/admin/* ガード)", () => {
  it("ADMIN は通過し User を返す", async () => {
    currentUser = admin;
    const r = await runGuard(requireAdmin, "/admin");
    expect(r.redirectedTo).toBeNull();
    expect(r.user?.id).toBe(admin.id);
  });

  it("FORTUNE_TELLER は自分のホーム /advisor へリダイレクト（拒否）", async () => {
    currentUser = advisor;
    const r = await runGuard(requireAdmin, "/admin");
    expect(r.redirectedTo).toBe("/advisor");
  });

  it("GENERAL は /mypage へリダイレクト（拒否）", async () => {
    currentUser = general;
    const r = await runGuard(requireAdmin, "/admin");
    expect(r.redirectedTo).toBe("/mypage");
  });

  it("未認証は /login?returnTo=... へリダイレクト", async () => {
    currentUser = null;
    const r = await runGuard(requireAdmin, "/admin/users");
    expect(r.redirectedTo).toContain("/login?returnTo=");
  });
});
