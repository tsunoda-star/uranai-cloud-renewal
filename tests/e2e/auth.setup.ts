/**
 * （非アクティブ）認証セットアップ。
 *
 * 本アプリは dev 認証（cookie `dev_role`）を使うため、メール/パスワードの
 * storageState セットアップは行わない。playwright.config から `setup` プロジェクトは
 * 削除済みで、このファイルは実行されない（ロール注入は fixtures/loginAs を使う）。
 *
 * 互換のため空のテストを 1 件だけ残す（`*.setup.ts` がマッチしても無害にするため、
 * かつ Playwright のテストファイルとして "no tests" エラーを避けるため）。
 */
import { test as setup } from '@playwright/test';

setup.describe.skip('legacy email/password auth (unused — dev auth via cookie)', () => {
  setup('noop', async () => {
    // 本アプリでは未使用。fixtures/loginAs(context, role) を利用する。
  });
});
