#!/usr/bin/env tsx
/**
 * WP → 新システム ブログ記事移管スクリプト
 *
 * - contents.uranai.cloud (WordPress) の公開記事を新システム BlogPost に移管
 * - 月詠（つきよみ）User 1名に著者集約 (role=ADMIN)
 * - WP categories / tags を BlogCategory / BlogTag に追加（既存と共存）
 * - HTML → Tiptap JSON (StarterKit + Link + Image + Table) → tiptapJsonToSafeHtml
 * - featured_media は _embed 経由で thumbnailUrl にマッピング
 * - slug は decodeURIComponent で日本語復元
 * - 画像 src は WP URL そのまま参照（案 A、SEC-5 ホワイトリスト通過）
 * - idempotent: 既存 slug は upsert で更新
 *
 * 実行:
 *   set -a && . ./.env.local && set +a
 *   DIRECT_URL="$DATABASE_URL_UNPOOLED" DATABASE_URL="$DATABASE_URL" \
 *     WP_MIGRATE_LIMIT=10 npx tsx scripts/migrate-wp.ts    # 試走（10件）
 *   DIRECT_URL="$DATABASE_URL_UNPOOLED" DATABASE_URL="$DATABASE_URL" \
 *     npx tsx scripts/migrate-wp.ts                        # 本実行
 */

// --- DOM shim (must run before any @tiptap/html import) ---
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
// @ts-expect-error - global shim for @tiptap/html on Node
globalThis.window = dom.window;
// @ts-expect-error - global shim for @tiptap/html on Node
globalThis.document = dom.window.document;
// @ts-expect-error - global shim
globalThis.DOMParser = dom.window.DOMParser;
// @ts-expect-error - global shim
globalThis.Node = dom.window.Node;
// @ts-expect-error - global shim
globalThis.Element = dom.window.Element;
// @ts-expect-error - global shim
globalThis.HTMLElement = dom.window.HTMLElement;
// @ts-expect-error - global shim
globalThis.XMLSerializer = dom.window.XMLSerializer;
// --- end DOM shim ---

import { PrismaClient, PostStatus, UserRole } from "@prisma/client";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { tiptapJsonToSafeHtml, buildExcerpt } from "../src/lib/blog/content-html";

const WP_BASE = "https://contents.uranai.cloud/wp-json/wp/v2";
const PER_PAGE = 100;
const UA = "uranai-cloud-renewal-migrator/1.0";
const AUTHOR_EMAIL = "tsukiyomi@uranai.cloud";
const AUTHOR_DISPLAY_NAME = "月詠（つきよみ）";
const LIMIT =
  parseInt(process.env.WP_MIGRATE_LIMIT ?? "0", 10) || Number.MAX_SAFE_INTEGER;
// publish 以外（draft / pending / future / private）は WP_USER + WP_APP_PASSWORD で Basic 認証が必要。
// カンマ区切りで複数指定可: WP_STATUSES="draft" / "publish,draft" / "any"
const WP_STATUSES = process.env.WP_STATUSES ?? "publish";
const WP_USER = process.env.WP_USER;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD?.replace(/\s+/g, "");
const AUTH_HEADER =
  WP_USER && WP_APP_PASSWORD
    ? `Basic ${Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString("base64")}`
    : null;

const EXTENSIONS = [
  StarterKit.configure({ heading: { levels: [2, 3] } }),
  Link.configure({ protocols: ["http", "https", "mailto"] }),
  Image.configure({ inline: false, allowBase64: false }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
];

// --- helpers ---

interface WpPost {
  id: number;
  slug: string;
  status: string;
  date_gmt?: string;
  modified_gmt?: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  author?: number;
  categories?: number[];
  tags?: number[];
  featured_media?: number;
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url?: string }>;
  };
}

interface WpTerm {
  id: number;
  name: string;
  slug: string;
}

async function wpFetch<T>(path: string): Promise<{ json: T; total: number }> {
  const headers: Record<string, string> = { "User-Agent": UA };
  if (AUTH_HEADER) headers.Authorization = AUTH_HEADER;
  const res = await fetch(`${WP_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`WP ${res.status}: ${path}`);
  const total = parseInt(res.headers.get("x-wp-total") ?? "0", 10);
  const json = (await res.json()) as T;
  return { json, total };
}

function decodeEntities(s: string): string {
  if (!s) return "";
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCodePoint(parseInt(h, 16))
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw).slice(0, 200);
  } catch {
    return raw.slice(0, 200);
  }
}

function mapStatus(wpStatus: string): PostStatus {
  switch (wpStatus) {
    case "publish":
      return PostStatus.PUBLISHED;
    case "future":
      return PostStatus.SCHEDULED;
    case "draft":
    case "pending":
    case "auto-draft":
      return PostStatus.DRAFT;
    case "private":
    case "trash":
      return PostStatus.ARCHIVED;
    default:
      return PostStatus.DRAFT;
  }
}

function htmlToTiptap(html: string): unknown {
  if (!html?.trim()) return { type: "doc", content: [{ type: "paragraph" }] };
  try {
    return generateJSON(html, EXTENSIONS);
  } catch (e) {
    console.warn(`  ⚠ generateJSON failed: ${(e as Error).message?.slice(0, 100)}`);
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
}

function extractThumbnailUrl(post: WpPost): string | null {
  const m = post._embedded?.["wp:featuredmedia"];
  if (Array.isArray(m) && m[0]?.source_url) return m[0].source_url;
  return null;
}

// --- main ---

async function main() {
  const prisma = new PrismaClient();
  const startTime = Date.now();

  console.log(`▶ WP migration start (limit=${LIMIT === Number.MAX_SAFE_INTEGER ? "ALL" : LIMIT})`);

  // 1. Author User
  const author = await prisma.user.upsert({
    where: { email: AUTHOR_EMAIL },
    update: { displayName: AUTHOR_DISPLAY_NAME, role: UserRole.ADMIN },
    create: {
      email: AUTHOR_EMAIL,
      displayName: AUTHOR_DISPLAY_NAME,
      role: UserRole.ADMIN,
    },
  });
  console.log(`✓ author User: ${author.id} (${AUTHOR_DISPLAY_NAME})`);

  // 2. Categories
  const { json: wpCats } = await wpFetch<WpTerm[]>(
    `/categories?per_page=100&_fields=id,name,slug`
  );
  const catMap = new Map<number, string>();
  for (const wc of wpCats) {
    const slug = `wp-${wc.slug}`.slice(0, 100); // 既存 seed と衝突回避のため wp- prefix
    const cat = await prisma.blogCategory.upsert({
      where: { slug },
      update: { name: wc.name },
      create: { slug, name: wc.name, sortOrder: 100 + (wc.id % 100) },
    });
    catMap.set(wc.id, cat.id);
  }
  console.log(`✓ categories: ${catMap.size} (wp- prefix で既存 seed と共存)`);

  // 3. Tags (paginated)
  const tagMap = new Map<number, string>();
  for (let page = 1; page <= 5; page++) {
    const { json: wpTags } = await wpFetch<WpTerm[]>(
      `/tags?per_page=100&page=${page}&_fields=id,name,slug`
    );
    if (!Array.isArray(wpTags) || wpTags.length === 0) break;
    for (const wt of wpTags) {
      const decodedSlug = decodeSlug(`wp-tag-${wt.slug}`).slice(0, 100);
      const tag = await prisma.blogTag.upsert({
        where: { slug: decodedSlug },
        update: { name: decodeEntities(wt.name) },
        create: { slug: decodedSlug, name: decodeEntities(wt.name) },
      });
      tagMap.set(wt.id, tag.id);
    }
    if (wpTags.length < 100) break;
  }
  console.log(`✓ tags: ${tagMap.size}`);

  // 4. Posts (paginated)
  console.log(`▶ WP_STATUSES=${WP_STATUSES} auth=${AUTH_HEADER ? "yes" : "no"}`);
  const { total } = await wpFetch<WpPost[]>(
    `/posts?per_page=1&status=${encodeURIComponent(WP_STATUSES)}`
  );
  const cap = Math.min(total, LIMIT);
  const pages = Math.ceil(cap / PER_PAGE);
  console.log(`▶ posts: total=${total} migrate=${cap} pages=${pages}`);

  let imported = 0,
    skipped = 0,
    failed = 0;
  const CONCURRENCY = parseInt(process.env.WP_MIGRATE_CONCURRENCY ?? "8", 10);

  async function processPost(
    post: WpPost
  ): Promise<"imported" | "skipped" | "failed"> {
    try {
      const slug = decodeSlug(post.slug);
      if (!slug) return "skipped";

      const title = decodeEntities(post.title?.rendered ?? slug).slice(0, 200);
      const doc = htmlToTiptap(post.content?.rendered ?? "");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contentHtml = tiptapJsonToSafeHtml(doc as any);

      const excerptText = stripHtml(post.excerpt?.rendered ?? "");
      const excerpt =
        (excerptText || buildExcerpt(doc, 160)).slice(0, 500) || null;

      const thumbnailUrl = extractThumbnailUrl(post);
      const wpCatId = post.categories?.[0];
      const categoryId = wpCatId !== undefined ? catMap.get(wpCatId) : null;
      if (!categoryId) {
        console.warn(`  ⚠ no category for wpPost #${post.id} slug=${slug}`);
        return "failed";
      }
      const tagIds = (post.tags ?? [])
        .map((t) => tagMap.get(t))
        .filter((v): v is string => Boolean(v));

      const publishedAt = post.date_gmt ? new Date(post.date_gmt + "Z") : null;
      const status = mapStatus(post.status);

      const existing = await prisma.blogPost.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (existing) {
        await prisma.$transaction([
          prisma.blogPostTag.deleteMany({ where: { postId: existing.id } }),
          prisma.blogPost.update({
            where: { id: existing.id },
            data: {
              title,
              excerpt,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              contentJson: doc as any,
              contentHtml,
              thumbnailUrl,
              status,
              publishedAt:
                status === PostStatus.PUBLISHED ? publishedAt : null,
              categoryId,
              authorId: author.id,
              tags: { create: tagIds.map((tid) => ({ tagId: tid })) },
            },
          }),
        ]);
      } else {
        await prisma.blogPost.create({
          data: {
            authorId: author.id,
            categoryId,
            slug,
            title,
            excerpt,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            contentJson: doc as any,
            contentHtml,
            thumbnailUrl,
            status,
            publishedAt:
              status === PostStatus.PUBLISHED ? publishedAt : null,
            tags: { create: tagIds.map((tid) => ({ tagId: tid })) },
          },
        });
      }
      return "imported";
    } catch (e) {
      console.warn(
        `  ⚠ failed wpPost #${post.id}: ${(e as Error).message?.slice(0, 200)}`
      );
      return "failed";
    }
  }

  outer: for (let p = 1; p <= pages; p++) {
    const { json: posts } = await wpFetch<WpPost[]>(
      `/posts?per_page=${PER_PAGE}&page=${p}&_embed=true&orderby=date&order=desc&status=${encodeURIComponent(WP_STATUSES)}`
    );
    if (!Array.isArray(posts) || posts.length === 0) break;

    // 並列処理（同一バッチ内を CONCURRENCY 単位で）
    for (let i = 0; i < posts.length; i += CONCURRENCY) {
      if (imported + failed + skipped >= cap) break outer;
      const batch = posts.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(processPost));
      for (const r of results) {
        if (r === "imported") imported++;
        else if (r === "skipped") skipped++;
        else failed++;
      }
    }
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `  [${elapsed}s] page ${p}/${pages}: imported=${imported} failed=${failed} skipped=${skipped}`
    );
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n=== Migration complete in ${elapsed}s ===`);
  console.log(`  imported: ${imported}`);
  console.log(`  skipped : ${skipped}`);
  console.log(`  failed  : ${failed}`);

  // 検証
  const dbTotal = await prisma.blogPost.count({
    where: { authorId: author.id },
  });
  console.log(`  DB total by 月詠: ${dbTotal}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
