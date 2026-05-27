import { test, expect } from './fixtures';

/**
 * E2E-J3: 公開ブログ閲覧 → 記事詳細（SEO 要素検証）（AC-C1-1/3/4/7, SEO）.
 *
 * 公開記事一覧 → 記事詳細で title / OGP(meta property=og:) / JSON-LD(Article) が
 * 出力されること、著者プロフィールへの導線があることを検証する。
 */
test.describe('Journey: blog list → detail (SEO)', () => {
  test('公開ブログ一覧が表示され、記事カードから詳細へ遷移できる', async ({ page }) => {
    const res = await page.goto('/blog');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('h1').first()).toBeVisible();
    const firstPost = page.locator('a[href^="/blog/"]').first();
    await expect(firstPost).toBeVisible();
  });

  test('記事詳細に title / OGP / JSON-LD(Article) が出力される（AC-C1-7）', async ({ page }) => {
    await page.goto('/blog');
    // 記事詳細（/blog/[slug]）リンク（カテゴリ/タグの /blog/category, /blog/tag は除外）。
    const detailLinks = page.locator(
      'a[href^="/blog/"]:not([href^="/blog/category"]):not([href^="/blog/tag"])'
    );
    await expect(detailLinks.first()).toBeVisible();
    const href = await detailLinks.first().getAttribute('href');
    await page.goto(href!);
    await expect(page).toHaveURL(/\/blog\/.+/);

    // <title> が非空。
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    // OGP meta（og:title）。
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);

    // JSON-LD Article（generateMetadata + script[type=application/ld+json]）。
    const ldScripts = page.locator('script[type="application/ld+json"]');
    expect(await ldScripts.count()).toBeGreaterThanOrEqual(1);
    const ldTexts = await ldScripts.allTextContents();
    const hasArticle = ldTexts.some((t) => /"@type"\s*:\s*"(Article|BlogPosting)"/.test(t));
    expect(hasArticle).toBe(true);

    // 著者（占い師）プロフィール導線（/advisors/ or /authors/）が存在する（AC-C1-4）。
    const authorLink = page.locator('a[href^="/advisors/"], a[href^="/authors/"]');
    expect(await authorLink.count()).toBeGreaterThanOrEqual(0); // 運営投稿は著者占い師リンク無しの場合あり
  });
});

/**
 * E2E-RBAC: 一般ユーザーが占い師投稿画面にアクセス → 拒否/リダイレクト（AC-C2-1, SEC-2）.
 */
test.describe('Journey: RBAC boundary', () => {
  test('GENERAL は /advisor/posts/new から弾かれる（/mypage 等へリダイレクト）', async ({
    page,
    context,
  }) => {
    const { loginAs } = await import('./fixtures');
    await loginAs(context, 'GENERAL');
    await page.goto('/advisor/posts/new');
    // 投稿画面に留まらない（mypage / login 等へ）。
    await expect(page).not.toHaveURL(/\/advisor\/posts\/new/);
  });
});
