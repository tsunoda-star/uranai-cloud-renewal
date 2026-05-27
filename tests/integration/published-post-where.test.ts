import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { publishedPostWhere } from "@/lib/queries";
import { testDb } from "./db-helper";

/**
 * I-8/I-9 結合: publishedPostWhere() の compute-on-read（ADR-1, AC-C2-6/7）.
 *
 * 実 DB の BlogPost に対し述語を適用し、
 *  - PUBLISHED(publishedAt 過去) / SCHEDULED(publishedAt 過去) は公開、
 *  - DRAFT / 未来 SCHEDULED / ARCHIVED は非公開
 * を直接検証する。seed は変更しない（read-only）。検証用に作る行は afterAll で削除。
 */
describe("publishedPostWhere (compute-on-read, ADR-1)", () => {
  let authorId: string;
  let categoryId: string;
  const createdSlugs: string[] = [];
  const slug = (k: string) => `__it-pp-${k}-${process.pid}`;

  beforeAll(async () => {
    const author = await testDb.user.findFirstOrThrow({
      where: { role: "FORTUNE_TELLER" },
      select: { id: true },
    });
    authorId = author.id;
    const cat = await testDb.blogCategory.findFirstOrThrow({ select: { id: true } });
    categoryId = cat.id;

    const past = new Date(Date.now() - 86_400_000); // 1日前
    const future = new Date(Date.now() + 30 * 86_400_000); // 30日後

    const fixtures: { k: string; status: "PUBLISHED" | "SCHEDULED" | "DRAFT" | "ARCHIVED"; publishedAt: Date | null }[] = [
      { k: "pub-past", status: "PUBLISHED", publishedAt: past },
      { k: "sched-past", status: "SCHEDULED", publishedAt: past }, // compute-on-read で公開扱い
      { k: "sched-future", status: "SCHEDULED", publishedAt: future }, // 未公開
      { k: "draft", status: "DRAFT", publishedAt: null },
      { k: "archived", status: "ARCHIVED", publishedAt: past }, // 取下げ済 → 非公開
    ];

    for (const f of fixtures) {
      const s = slug(f.k);
      createdSlugs.push(s);
      await testDb.blogPost.create({
        data: {
          slug: s,
          title: `IT PP ${f.k}`,
          excerpt: "integration test fixture",
          contentJson: { type: "doc", content: [] },
          contentHtml: "",
          status: f.status,
          publishedAt: f.publishedAt,
          authorId,
          categoryId,
        },
      });
    }
  });

  afterAll(async () => {
    await testDb.blogPost.deleteMany({ where: { slug: { in: createdSlugs } } });
  });

  it("PUBLISHED(過去) と SCHEDULED(過去) は公開対象に含まれる", async () => {
    const visible = await testDb.blogPost.findMany({
      where: { AND: [publishedPostWhere(), { slug: { in: createdSlugs } }] },
      select: { slug: true },
    });
    const slugs = visible.map((p) => p.slug);
    expect(slugs).toContain(slug("pub-past"));
    expect(slugs).toContain(slug("sched-past"));
  });

  it("DRAFT / 未来 SCHEDULED / ARCHIVED は公開対象に含まれない", async () => {
    const visible = await testDb.blogPost.findMany({
      where: { AND: [publishedPostWhere(), { slug: { in: createdSlugs } }] },
      select: { slug: true },
    });
    const slugs = visible.map((p) => p.slug);
    expect(slugs).not.toContain(slug("draft"));
    expect(slugs).not.toContain(slug("sched-future"));
    expect(slugs).not.toContain(slug("archived"));
  });

  it("now を未来に進めると、未来 SCHEDULED も公開対象になる（時刻到達 = 自動公開）", async () => {
    const futureNow = new Date(Date.now() + 60 * 86_400_000); // 60日後
    const visible = await testDb.blogPost.findMany({
      where: { AND: [publishedPostWhere(futureNow), { slug: { in: createdSlugs } }] },
      select: { slug: true },
    });
    const slugs = visible.map((p) => p.slug);
    expect(slugs).toContain(slug("sched-future"));
    // ARCHIVED は時刻が来ても公開されない。
    expect(slugs).not.toContain(slug("archived"));
  });

  it("正確に公開対象は 2 件（pub-past, sched-past）であること", async () => {
    const count = await testDb.blogPost.count({
      where: { AND: [publishedPostWhere(), { slug: { in: createdSlugs } }] },
    });
    expect(count).toBe(2);
  });
});
