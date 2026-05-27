import { describe, it, expect, afterEach, beforeEach } from "vitest";

import { isDevAuthEnabled, isStagingDevAuth } from "@/lib/auth/dev-gate";
import { DevAuthProvider } from "@/lib/auth/dev-auth-provider";
import { CcAuthProvider } from "@/lib/auth/cc-auth-provider";

/**
 * 単体: ステージング認証述語（ADR-3 staging opt-in 拡張）。
 *
 * 新ルール: dev 認証が有効 ⇔
 *   AUTH_PROVIDER === "dev"
 *   AND ( NODE_ENV !== "production"  OR  ALLOW_DEV_AUTH === "true" )
 *
 * セキュリティ上の核心:
 *   - 真の本番（prod + flag なし + AUTH_PROVIDER=dev）では dev を拒否し、
 *     構造的に dev 経路へ到達できない（リグレッション厳禁）。
 *   - prod + ALLOW_DEV_AUTH=true（Vercel staging）でのみ dev を明示開放。
 *   - selectProvider / isDevAuthEnabled / DevAuthProvider ctor が同一述語を共有。
 *
 * 述語は呼び出し時に process.env を読むため、各ケースで env を組み立て直す。
 */

// テストが触る env キーのスナップショットと復元（他テストへ漏らさない）。
const ENV_KEYS = ["AUTH_PROVIDER", "NODE_ENV", "ALLOW_DEV_AUTH"] as const;
type EnvKey = (typeof ENV_KEYS)[number];

const saved: Partial<Record<EnvKey, string | undefined>> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    const v = saved[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

/** Helper: deterministically set the three env knobs for a case. */
function setEnv(env: {
  authProvider?: string;
  nodeEnv?: string;
  allowDevAuth?: string;
}): void {
  if (env.authProvider === undefined) delete process.env.AUTH_PROVIDER;
  else process.env.AUTH_PROVIDER = env.authProvider;

  if (env.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = env.nodeEnv;

  if (env.allowDevAuth === undefined) delete process.env.ALLOW_DEV_AUTH;
  else process.env.ALLOW_DEV_AUTH = env.allowDevAuth;
}

describe("isDevAuthEnabled — staging opt-in matrix (ADR-3)", () => {
  // ── ケース1: prod + flag → dev 許可（Vercel staging）─────────────────
  it("CASE 1: prod + ALLOW_DEV_AUTH=true → dev を許可", () => {
    setEnv({ authProvider: "dev", nodeEnv: "production", allowDevAuth: "true" });
    expect(isDevAuthEnabled()).toBe(true);
  });

  // ── ケース2: prod + flag なし → dev 拒否（真の本番。CcAuth へ）─────────
  it("CASE 2: prod + ALLOW_DEV_AUTH 未設定 → dev を拒否（真の本番）", () => {
    setEnv({ authProvider: "dev", nodeEnv: "production", allowDevAuth: undefined });
    expect(isDevAuthEnabled()).toBe(false);
  });

  it("CASE 2b: prod + ALLOW_DEV_AUTH='false' → dev を拒否", () => {
    setEnv({ authProvider: "dev", nodeEnv: "production", allowDevAuth: "false" });
    expect(isDevAuthEnabled()).toBe(false);
  });

  it("CASE 2c: prod + ALLOW_DEV_AUTH='1'（'true' 以外）→ dev を拒否", () => {
    setEnv({ authProvider: "dev", nodeEnv: "production", allowDevAuth: "1" });
    expect(isDevAuthEnabled()).toBe(false);
  });

  // ── ケース3: 非 prod → dev 許可（ローカル開発。flag 不要・従来どおり）──
  it("CASE 3: NODE_ENV=development → dev を許可（flag 不要）", () => {
    setEnv({ authProvider: "dev", nodeEnv: "development", allowDevAuth: undefined });
    expect(isDevAuthEnabled()).toBe(true);
  });

  it("CASE 3b: NODE_ENV=test → dev を許可（flag 不要）", () => {
    setEnv({ authProvider: "dev", nodeEnv: "test", allowDevAuth: undefined });
    expect(isDevAuthEnabled()).toBe(true);
  });

  it("CASE 3c: 非 prod では ALLOW_DEV_AUTH の値に関わらず dev 許可", () => {
    setEnv({ authProvider: "dev", nodeEnv: "development", allowDevAuth: "false" });
    expect(isDevAuthEnabled()).toBe(true);
  });

  // ── AUTH_PROVIDER!=dev は常に false（flag があっても dev を強制しない）──
  it("AUTH_PROVIDER 未設定なら staging flag があっても dev 無効", () => {
    setEnv({ authProvider: undefined, nodeEnv: "production", allowDevAuth: "true" });
    expect(isDevAuthEnabled()).toBe(false);
  });

  it("AUTH_PROVIDER=cc-auth なら dev 無効（非 prod でも）", () => {
    setEnv({ authProvider: "cc-auth", nodeEnv: "development", allowDevAuth: "true" });
    expect(isDevAuthEnabled()).toBe(false);
  });
});

describe("isStagingDevAuth — banner condition (prod 上の dev opt-in のみ true)", () => {
  it("prod + dev + ALLOW_DEV_AUTH=true でのみ true（バナー表示）", () => {
    setEnv({ authProvider: "dev", nodeEnv: "production", allowDevAuth: "true" });
    expect(isStagingDevAuth()).toBe(true);
  });

  it("ローカル開発（非 prod）では false（バナー非表示）", () => {
    setEnv({ authProvider: "dev", nodeEnv: "development", allowDevAuth: "true" });
    expect(isStagingDevAuth()).toBe(false);
  });

  it("真の本番（flag なし）では false（バナー非表示）", () => {
    setEnv({ authProvider: "dev", nodeEnv: "production", allowDevAuth: undefined });
    expect(isStagingDevAuth()).toBe(false);
  });

  it("CcAuth 本番では false（バナー非表示）", () => {
    setEnv({ authProvider: undefined, nodeEnv: "production", allowDevAuth: undefined });
    expect(isStagingDevAuth()).toBe(false);
  });
});

describe("DevAuthProvider 構築ガード（同一述語の defense-in-depth）", () => {
  it("CASE 1: prod + flag → 構築できる（throw しない）", () => {
    setEnv({ authProvider: "dev", nodeEnv: "production", allowDevAuth: "true" });
    expect(() => new DevAuthProvider()).not.toThrow();
  });

  it("CASE 2: prod + flag なし → 構築は hard-throw（真の本番ガード）", () => {
    setEnv({ authProvider: "dev", nodeEnv: "production", allowDevAuth: undefined });
    expect(() => new DevAuthProvider()).toThrow(/ADR-3 prod guard/);
  });

  it("CASE 3: 非 prod → 構築できる（従来どおり）", () => {
    setEnv({ authProvider: "dev", nodeEnv: "development", allowDevAuth: undefined });
    expect(() => new DevAuthProvider()).not.toThrow();
  });
});

describe("CcAuthProvider — 真の本番フォールバック先（dev 拒否時に選ばれる側）", () => {
  it("CC_AUTH_* 未設定では fail-fast（dev 経路が消えた本番の既定挙動）", () => {
    // selectProvider は dev 拒否時に CcAuthProvider を構築する。CC-Auth は
    // OPEN-2 未設定のため fail-fast（forged identity ではなく明示エラー）。
    const prevPool = process.env.CC_AUTH_USER_POOL_ID;
    const prevClient = process.env.CC_AUTH_CLIENT_ID;
    const prevRegion = process.env.CC_AUTH_REGION;
    delete process.env.CC_AUTH_USER_POOL_ID;
    delete process.env.CC_AUTH_CLIENT_ID;
    delete process.env.CC_AUTH_REGION;
    try {
      expect(() => new CcAuthProvider()).toThrow(/not configured/);
    } finally {
      if (prevPool !== undefined) process.env.CC_AUTH_USER_POOL_ID = prevPool;
      if (prevClient !== undefined) process.env.CC_AUTH_CLIENT_ID = prevClient;
      if (prevRegion !== undefined) process.env.CC_AUTH_REGION = prevRegion;
    }
  });
});
