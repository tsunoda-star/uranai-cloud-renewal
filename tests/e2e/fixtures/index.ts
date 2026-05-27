import { test as base, expect, type BrowserContext } from '@playwright/test';
import type { UserRole } from '@prisma/client';

/**
 * Dev 認証用フィクスチャ（ADR-3: cookie `dev_role` でロール切替）.
 *
 * 本アプリは CC-Auth 未確定の間 dev アダプタ（AUTH_PROVIDER=dev）で動作する。
 * E2E はメール/パスワード画面を経由せず、`dev_role` cookie を直接注入してロールを
 * 確定させる（DevAuthProvider が cookie を読む）。dev サーバは playwright.config の
 * webServer が AUTH_PROVIDER=dev で起動する。
 *
 * Usage:
 *   import { test, expect, loginAs } from '../fixtures';
 *   test('占い師ダッシュボード', async ({ page, context }) => {
 *     await loginAs(context, 'FORTUNE_TELLER');
 *     await page.goto('/advisor');
 *   });
 */

/** dev_role cookie を注入してロールを確定する。 */
export async function loginAs(
  context: BrowserContext,
  role: UserRole,
  baseURL = process.env.BASE_URL || 'http://localhost:3100'
): Promise<void> {
  const url = new URL(baseURL);
  await context.addCookies([
    {
      name: 'dev_role',
      value: role,
      domain: url.hostname,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

export const test = base;
export { expect };
