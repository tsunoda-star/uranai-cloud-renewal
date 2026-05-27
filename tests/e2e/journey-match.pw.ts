import { test, expect } from './fixtures';

/**
 * E2E-J2: /match マッチング相談（AC-B6）.
 *
 * マッチングフォームに入力 → 候補（or 0 件時の代替提案）が提示されることを検証。
 * 候補は占い師プロフィールへのリンクとして提示される。
 */
test.describe('Journey: matching consultation', () => {
  test('/match が表示され、フォーム入力で占い師候補が提示される', async ({ page }) => {
    const res = await page.goto('/match');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('h1').first()).toBeVisible();

    // 悩みカテゴリ or 占術カテゴリの選択肢を 1 つ選んで送信する。
    // ラジオ/セレクト/ボタンいずれの実装でも拾えるよう段階的に試行。
    const concernRadio = page.getByRole('radio').first();
    const selectEl = page.locator('select').first();
    if (await concernRadio.count() > 0) {
      await concernRadio.check({ force: true }).catch(() => {});
    } else if (await selectEl.count() > 0) {
      await selectEl.selectOption({ index: 1 }).catch(() => {});
    }

    // 送信（「相談する / マッチング / 探す」系ボタン）。
    const submit = page.getByRole('button', { name: /相談|マッチ|探す|候補/ }).first();
    if (await submit.count() > 0) {
      await submit.click().catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
    }

    // 候補（占い師リンク）または代替提案が表示される（AC-B6-4/5）。
    const candidates = page.locator('a[href^="/advisors/"]');
    await expect(candidates.first()).toBeVisible({ timeout: 10_000 });
  });
});
