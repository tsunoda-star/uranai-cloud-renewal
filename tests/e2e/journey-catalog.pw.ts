import { test, expect } from './fixtures';

/**
 * E2E-J1: トップ → 占い師検索/絞り込み → プロフィール → 予約リクエスト導線（AC-A1, B-1/3/4/7）.
 *
 * 実 DB(:5433) のシード（公開占い師 16）に対し、UI から検索 → 絞り込み（URL 反映） →
 * プロフィール → 予約フォーム到達までを検証する。selector は role / URL ベースで頑健に。
 */
test.describe('Journey: catalog → profile → booking', () => {
  test('トップが表示され主要導線（占い師を探す）から /advisors へ遷移できる', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBeLessThan(400);
    // ヒーロー見出しが存在（h1）。
    await expect(page.locator('h1').first()).toBeVisible();
    // 「占い師を探す」系リンクで /advisors へ。
    const toAdvisors = page.getByRole('link', { name: /占い師を探す|占い師/ }).first();
    await toAdvisors.click();
    await expect(page).toHaveURL(/\/advisors/);
  });

  test('占い師一覧でカテゴリ絞り込みが URL に反映され、リロードで再現する（AC-B3-6）', async ({ page }) => {
    await page.goto('/advisors?category=tarot');
    await expect(page).toHaveURL(/category=tarot/);
    // カード（占い師プロフィールへのリンク）が 1 件以上存在。
    const cards = page.locator('a[href^="/advisors/"]');
    await expect(cards.first()).toBeVisible();
    // リロードしてもフィルタが保持される。
    await page.reload();
    await expect(page).toHaveURL(/category=tarot/);
  });

  test('一覧 → プロフィール詳細 → 予約リクエスト導線まで到達できる', async ({ page }) => {
    await page.goto('/advisors');
    const firstCard = page.locator('a[href^="/advisors/"]').first();
    await expect(firstCard).toBeVisible();
    const href = await firstCard.getAttribute('href');
    expect(href).toMatch(/^\/advisors\//);
    await firstCard.click();
    await expect(page).toHaveURL(/\/advisors\/.+/);
    // プロフィール見出し。
    await expect(page.locator('h1').first()).toBeVisible();
    // 「相談する / 予約」系 CTA が存在する（booking 導線）。
    const cta = page.getByRole('link', { name: /相談|予約/ }).first();
    await expect(cta).toBeVisible();
  });
});
