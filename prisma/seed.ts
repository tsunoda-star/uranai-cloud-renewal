/**
 * Representative seed data (spec §11 "アンブロック・トラック").
 *
 * This is NOT mock data left in production code: it is the unblock-track dataset
 * that lets every screen / search / E2E flow be built while OPEN-3 (legacy data
 * format) is pending. The real migration (scripts/migrate-legacy.ts, W4) targets
 * the SAME schema, so going live is a data swap — not a code change.
 *
 * Idempotent: every write is an upsert keyed on a stable natural key, so
 * `npm run db:seed` can run repeatedly.
 */
import {
  PrismaClient,
  UserRole,
  ConsultationMethod,
  DivinationCategorySlug,
  PostStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// 1. Divination categories (15, matching the enum)
// ---------------------------------------------------------------------------
const CATEGORIES: ReadonlyArray<{
  slug: DivinationCategorySlug;
  name: string;
  description: string;
  iconKey: string;
}> = [
  { slug: "TAROT", name: "タロット", description: "カードが映す今と未来のヒント", iconKey: "sparkles" },
  { slug: "PALMISTRY", name: "手相", description: "手のひらに刻まれた運命を読む", iconKey: "hand" },
  { slug: "FOUR_PILLARS", name: "四柱推命", description: "生年月日時から本質と運勢を診断", iconKey: "columns" },
  { slug: "NINE_STAR_KI", name: "九星気学", description: "九つの星と方位で運気を整える", iconKey: "compass" },
  { slug: "NUMEROLOGY", name: "数秘術", description: "数字が示すあなたの使命", iconKey: "hash" },
  { slug: "SPIRITUAL_SENSE", name: "霊感", description: "研ぎ澄まされた感性で本質を見抜く", iconKey: "eye" },
  { slug: "FENG_SHUI", name: "風水", description: "環境を整え運気の流れを最適化", iconKey: "home" },
  { slug: "PHYSIOGNOMY", name: "人相", description: "顔立ちから性格と運勢を読み解く", iconKey: "user" },
  { slug: "WESTERN_ASTROLOGY", name: "西洋占星術", description: "星々の配置が描く人生の地図", iconKey: "star" },
  { slug: "SPIRITUAL", name: "スピリチュアル", description: "魂の声に寄り添うセッション", iconKey: "moon" },
  { slug: "SANMEI", name: "算命学", description: "宿命と運命を体系的に読み解く", iconKey: "scroll" },
  { slug: "EKI", name: "易", description: "八卦と六十四卦で答えを導く", iconKey: "book" },
  { slug: "NAME_DIVINATION", name: "姓名判断", description: "名前の画数に宿る運勢", iconKey: "pen" },
  { slug: "SIX_STAR", name: "六星占術", description: "運命周期から最適なタイミングを知る", iconKey: "orbit" },
  { slug: "OTHER", name: "その他", description: "多彩な占術・占法", iconKey: "more-horizontal" },
];

// ---------------------------------------------------------------------------
// 2. Advisors (16) — User + FortuneTellerProfile + categories + methods
// ---------------------------------------------------------------------------
const METHOD_POOL: ConsultationMethod[] = [
  "PHONE",
  "CHAT",
  "EMAIL",
  "ZOOM",
  "IN_PERSON",
];

interface AdvisorSeed {
  slug: string;
  displayName: string;
  email: string;
  bio: string;
  experience: string;
  primaryCategory: DivinationCategorySlug;
  secondaryCategories: DivinationCategorySlug[];
  methods: ConsultationMethod[];
  ratingAverage: number;
  ratingCount: number;
  photoUrl: string;
}

const ADVISOR_NAMES: ReadonlyArray<{ name: string; cats: DivinationCategorySlug[] }> = [
  { name: "月見 凛", cats: ["TAROT", "WESTERN_ASTROLOGY"] },
  { name: "星川 さくら", cats: ["WESTERN_ASTROLOGY", "NUMEROLOGY"] },
  { name: "白鷺 美琴", cats: ["PALMISTRY", "PHYSIOGNOMY"] },
  { name: "九条 玲", cats: ["FOUR_PILLARS", "SANMEI"] },
  { name: "天野 ひかり", cats: ["NINE_STAR_KI", "FENG_SHUI"] },
  { name: "桜井 真希", cats: ["NUMEROLOGY", "TAROT"] },
  { name: "霧島 蓮", cats: ["SPIRITUAL_SENSE", "SPIRITUAL"] },
  { name: "風間 涼介", cats: ["FENG_SHUI", "NINE_STAR_KI"] },
  { name: "高峰 結衣", cats: ["PHYSIOGNOMY", "PALMISTRY"] },
  { name: "明星 怜", cats: ["WESTERN_ASTROLOGY", "TAROT"] },
  { name: "瑠璃川 静", cats: ["SPIRITUAL", "SPIRITUAL_SENSE"] },
  { name: "山辺 千歳", cats: ["SANMEI", "FOUR_PILLARS"] },
  { name: "東雲 葵", cats: ["EKI", "NAME_DIVINATION"] },
  { name: "藤宮 美月", cats: ["NAME_DIVINATION", "NUMEROLOGY"] },
  { name: "南雲 翔", cats: ["SIX_STAR", "FOUR_PILLARS"] },
  { name: "椿 千早", cats: ["TAROT", "SPIRITUAL"] },
];

function buildAdvisors(): AdvisorSeed[] {
  return ADVISOR_NAMES.map((a, i) => {
    const slug = `advisor-${String(i + 1).padStart(2, "0")}`;
    const methods = METHOD_POOL.slice(0, 2 + (i % 4)); // 2-5 methods
    return {
      slug,
      displayName: a.name,
      email: `${slug}@uranai.local`,
      bio: `${a.name}と申します。${CATEGORIES.find((c) => c.slug === a.cats[0])?.name}を中心に、お一人おひとりの悩みに丁寧に寄り添う鑑定を心がけています。`,
      experience: `鑑定歴${5 + (i % 15)}年。延べ${(i + 3) * 1200}件以上の相談実績。`,
      primaryCategory: a.cats[0],
      secondaryCategories: a.cats.slice(1),
      methods,
      ratingAverage: Number((4.2 + ((i % 8) * 0.1)).toFixed(2)),
      ratingCount: 18 + i * 7,
      // 本家 uranai.cloud の実写アバター（public/avatars/real-XX.png にローカル取得）。
      // 16 名へ real-01..real-16 を index 順で決定論的に割当（冪等・再 seed 安全）。
      photoUrl: `/avatars/real-${String(i + 1).padStart(2, "0")}.png`,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. Blog categories & tags
// ---------------------------------------------------------------------------
const BLOG_CATEGORIES: ReadonlyArray<{ slug: string; name: string; description: string }> = [
  { slug: "love", name: "恋愛・結婚", description: "恋の悩みと縁結びのヒント" },
  { slug: "work", name: "仕事・転職", description: "キャリアと働き方の指針" },
  { slug: "money", name: "金運・財運", description: "お金まわりの開運術" },
  { slug: "fortune-basics", name: "占術入門", description: "占いの基礎知識をやさしく解説" },
  { slug: "self", name: "自分らしさ", description: "本来の自分と向き合うために" },
];

const BLOG_TAGS: ReadonlyArray<{ slug: string; name: string }> = [
  { slug: "tarot", name: "タロット" },
  { slug: "astrology", name: "占星術" },
  { slug: "love", name: "恋愛" },
  { slug: "lucky-action", name: "開運アクション" },
  { slug: "beginner", name: "初心者向け" },
  { slug: "feng-shui", name: "風水" },
  { slug: "numerology", name: "数秘術" },
];

const REVIEW_AUTHORS = [
  "M.K", "さくら", "悩める子羊", "Hiro", "りんご", "ゆうこ",
  "T.S", "匿名希望", "ねこ好き", "Kana", "晴れ男", "もも",
];

const REVIEW_COMMENTS = [
  "親身に話を聞いてくださり、心が軽くなりました。",
  "具体的なアドバイスで前向きになれました。",
  "鋭い洞察に驚きました。また相談したいです。",
  "優しい語り口で安心して話せました。",
  "迷っていたことに踏ん切りがつきました。",
  "当たっていてびっくり。背中を押してもらえました。",
];

async function main() {
  console.log("🌱 seeding uranai-cloud-renewal ...");

  // --- Categories ---
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    await prisma.divinationCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, iconKey: c.iconKey, sortOrder: i },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        iconKey: c.iconKey,
        sortOrder: i,
      },
    });
  }
  const categoryMap = new Map(
    (await prisma.divinationCategory.findMany()).map((c) => [c.slug, c.id])
  );

  // --- Admin user (blog author for 運営 posts) ---
  const admin = await prisma.user.upsert({
    where: { email: "admin@uranai.local" },
    update: { displayName: "運営事務局", role: UserRole.ADMIN },
    create: {
      email: "admin@uranai.local",
      displayName: "運営事務局",
      role: UserRole.ADMIN,
    },
  });

  // --- Dev principals (ADR-3 DevAuthProvider) ---
  // These rows back the 3 development roles so that a dev session
  // (cookie `dev_role`) resolves to a REAL User row — favorites / ownership
  // checks then run against live data. They are double-gated at runtime
  // (AUTH_PROVIDER=dev AND NODE_ENV!=production); on prod the dev path is
  // unreachable, so these rows are inert. The GENERAL principal in particular
  // gives the only seeded GENERAL account, which お気に入り (Favorite) needs.
  const DEV_PRINCIPALS: ReadonlyArray<{
    sub: string;
    email: string;
    displayName: string;
    role: UserRole;
  }> = [
    {
      sub: "dev-general",
      email: "dev.general@uranai.local",
      displayName: "開発ユーザー（一般）",
      role: UserRole.GENERAL,
    },
    {
      // NOTE: the dev FT principal OWNS the dedicated public advisor profile
      // (advisor-16) so its DB displayName is the world-view advisor name
      // "椿 千早" — that is what renders on the public site. The dev LOGIN
      // session label ("開発ユーザー（占い師）") is independent and comes from
      // DEV_PRINCIPALS in src/lib/auth/dev-auth-provider.ts (resolved by sub),
      // so the dev role switcher / account menu is unaffected.
      sub: "dev-fortune-teller",
      email: "dev.advisor@uranai.local",
      displayName: "椿 千早",
      role: UserRole.FORTUNE_TELLER,
    },
    {
      sub: "dev-admin",
      email: "dev.admin@uranai.local",
      displayName: "開発ユーザー（運営）",
      role: UserRole.ADMIN,
    },
  ];
  for (const p of DEV_PRINCIPALS) {
    await prisma.user.upsert({
      where: { email: p.email },
      update: { displayName: p.displayName, role: p.role, ccAuthSub: p.sub },
      create: {
        email: p.email,
        displayName: p.displayName,
        role: p.role,
        ccAuthSub: p.sub,
      },
    });
  }

  // --- Advisors (User + Profile + categories + methods) ---
  const advisors = buildAdvisors();
  const advisorProfileIds: string[] = [];
  for (const a of advisors) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: { displayName: a.displayName, role: UserRole.FORTUNE_TELLER },
      create: {
        email: a.email,
        displayName: a.displayName,
        role: UserRole.FORTUNE_TELLER,
      },
    });

    // 本家 uranai.cloud の実写アバター（public/avatars/real-XX.png にローカル取得済）。
    // photoUrl is resolved first by queries (Advisor.photoUrl ?? User.avatarUrl),
    // so this is what renders on cards / profiles. W4 データ移行時は実 URL
    // (asset.matchingcloud.com/user/*.png) に差し替え可（next.config remotePatterns 許可済）。
    const photoUrl = a.photoUrl;
    const profile = await prisma.fortuneTellerProfile.upsert({
      where: { slug: a.slug },
      update: {
        bio: a.bio,
        experience: a.experience,
        isPublished: true,
        ratingAverage: a.ratingAverage,
        ratingCount: a.ratingCount,
        photoUrl,
      },
      create: {
        userId: user.id,
        slug: a.slug,
        bio: a.bio,
        experience: a.experience,
        isPublished: true,
        ratingAverage: a.ratingAverage,
        ratingCount: a.ratingCount,
        photoUrl,
      },
    });
    advisorProfileIds.push(profile.id);

    // categories (primary + secondary), idempotent via upsert on composite PK
    const allCats = [a.primaryCategory, ...a.secondaryCategories];
    for (let ci = 0; ci < allCats.length; ci++) {
      const categoryId = categoryMap.get(allCats[ci]);
      if (!categoryId) continue;
      await prisma.advisorCategory.upsert({
        where: {
          advisorId_categoryId: { advisorId: profile.id, categoryId },
        },
        update: { isPrimary: ci === 0 },
        create: { advisorId: profile.id, categoryId, isPrimary: ci === 0 },
      });
    }

    // methods
    for (const method of a.methods) {
      await prisma.advisorMethod.upsert({
        where: { advisorId_method: { advisorId: profile.id, method } },
        update: {},
        create: { advisorId: profile.id, method },
      });
    }
  }

  // --- Link the dev FORTUNE_TELLER principal to a DEDICATED advisor profile ---
  // The DevAuthProvider FORTUNE_TELLER session (sub `dev-fortune-teller`) needs to
  // OWN a FortuneTellerProfile so the /advisor/* dashboards, ownership checks
  // (SEC-3) and the end-to-end booking→response loop are exercisable in dev.
  //
  // We attach the dev FT user to a DEDICATED advisor (advisor-16 = "椿 千早"),
  // NOT advisor-01. Previously advisor-01 was transferred to the dev FT user,
  // which made advisor-01 render with the dev display name "開発ユーザー（占い師）"
  // on the public site (it reads displayName via the owning User). Using a
  // dedicated advisor keeps every public advisor name correct (advisor-01 stays
  // "月見 凛") while the dev FT principal still owns a real published profile.
  //
  // Idempotency / migration: if a previous seed had already moved advisor-01 to
  // the dev FT user, we hand advisor-01 BACK to its canonical owner
  // (advisor-01@uranai.local), recreating that user if needed, and repoint any
  // advisor-01-authored blog posts back to that canonical owner. On prod the dev
  // path is unreachable, so these rows are inert there.
  const DEV_FT_ADVISOR_SLUG = "advisor-16";
  {
    const devFt = await prisma.user.findUnique({
      where: { email: "dev.advisor@uranai.local" },
      select: { id: true },
    });

    // 1) Reclaim advisor-01 for its canonical owner if a prior seed stole it.
    const advisor01 = await prisma.fortuneTellerProfile.findUnique({
      where: { slug: "advisor-01" },
      select: { id: true, userId: true },
    });
    if (devFt && advisor01 && advisor01.userId === devFt.id) {
      const canonical = await prisma.user.upsert({
        where: { email: "advisor-01@uranai.local" },
        update: { displayName: "月見 凛", role: UserRole.FORTUNE_TELLER },
        create: {
          email: "advisor-01@uranai.local",
          displayName: "月見 凛",
          role: UserRole.FORTUNE_TELLER,
        },
      });
      await prisma.fortuneTellerProfile.update({
        where: { id: advisor01.id },
        data: { userId: canonical.id },
      });
      // Repoint advisor-01-authored posts back to the canonical owner.
      await prisma.blogPost.updateMany({
        where: { authorId: devFt.id, advisorProfileId: advisor01.id },
        data: { authorId: canonical.id },
      });
    }

    // 2) Attach the dev FT user to the dedicated advisor profile (advisor-16).
    const devAdvisor = await prisma.fortuneTellerProfile.findUnique({
      where: { slug: DEV_FT_ADVISOR_SLUG },
      select: { id: true, userId: true },
    });
    if (devFt && devAdvisor && devAdvisor.userId !== devFt.id) {
      const priorOwnerId = devAdvisor.userId;
      await prisma.fortuneTellerProfile.update({
        where: { id: devAdvisor.id },
        data: { userId: devFt.id },
      });
      // Repoint blog posts authored under the dedicated advisor to the new owner.
      await prisma.blogPost.updateMany({
        where: { authorId: priorOwnerId, advisorProfileId: devAdvisor.id },
        data: { authorId: devFt.id },
      });
    }
  }

  // --- Services (~32: 2 per advisor) — deterministic ids for idempotency ---
  let serviceCount = 0;
  for (let i = 0; i < advisors.length; i++) {
    const a = advisors[i];
    const profileId = advisorProfileIds[i];
    const primaryCatId = categoryMap.get(a.primaryCategory)!;
    const services = [
      {
        title: `${CATEGORIES.find((c) => c.slug === a.primaryCategory)?.name}・じっくり鑑定`,
        method: a.methods[0],
        priceJpy: 3000 + (i % 5) * 500,
        durationMin: 30,
      },
      {
        title: `お悩み相談ライト（${CATEGORIES.find((c) => c.slug === a.primaryCategory)?.name}）`,
        method: a.methods[Math.min(1, a.methods.length - 1)],
        priceJpy: 1500 + (i % 4) * 300,
        durationMin: 15,
      },
    ];
    for (let si = 0; si < services.length; si++) {
      const s = services[si];
      const id = `seed-svc-${a.slug}-${si}`;
      await prisma.service.upsert({
        where: { id },
        update: {
          title: s.title,
          method: s.method,
          priceJpy: s.priceJpy,
          durationMin: s.durationMin,
          isPublished: true,
        },
        create: {
          id,
          advisorId: profileId,
          categoryId: primaryCatId,
          title: s.title,
          description: `${s.title}。あなたのお悩みに合わせて丁寧に鑑定します。`,
          method: s.method,
          priceJpy: s.priceJpy,
          durationMin: s.durationMin,
          isPublished: true,
        },
      });
      serviceCount++;
    }
  }

  // --- Reviews (legacy migration style: legacyAuthorName, authorId null) ---
  let reviewCount = 0;
  for (let i = 0; i < advisorProfileIds.length; i++) {
    const profileId = advisorProfileIds[i];
    const n = 3 + (i % 3); // 3-5 reviews each
    for (let r = 0; r < n; r++) {
      const id = `seed-review-${i}-${r}`;
      await prisma.review.upsert({
        where: { id },
        update: {},
        create: {
          id,
          advisorId: profileId,
          authorId: null,
          legacyAuthorName: REVIEW_AUTHORS[(i + r) % REVIEW_AUTHORS.length],
          rating: 4 + ((i + r) % 2), // 4 or 5
          comment: REVIEW_COMMENTS[(i + r) % REVIEW_COMMENTS.length],
        },
      });
      reviewCount++;
    }
  }

  // --- Blog categories & tags ---
  for (let i = 0; i < BLOG_CATEGORIES.length; i++) {
    const bc = BLOG_CATEGORIES[i];
    await prisma.blogCategory.upsert({
      where: { slug: bc.slug },
      update: { name: bc.name, description: bc.description, sortOrder: i },
      create: { slug: bc.slug, name: bc.name, description: bc.description, sortOrder: i },
    });
  }
  for (const t of BLOG_TAGS) {
    await prisma.blogTag.upsert({
      where: { slug: t.slug },
      update: { name: t.name },
      create: { slug: t.slug, name: t.name },
    });
  }
  const blogCatMap = new Map(
    (await prisma.blogCategory.findMany()).map((c) => [c.slug, c.id])
  );
  const blogTagMap = new Map(
    (await prisma.blogTag.findMany()).map((t) => [t.slug, t.id])
  );

  // --- Blog posts (mixed statuses: published / draft / scheduled / archived) ---
  const firstAdvisorProfile = await prisma.fortuneTellerProfile.findFirst({
    where: { slug: "advisor-01" },
    include: { user: true },
  });

  const now = Date.now();
  // Divination-themed local SVG covers (public/blog/cover-*.svg). Warm + navy,
  // no purple gradient. Assigned per article by its motif (tarot/star/crystal/
  // moon/palm). Local asset = no remote image domain config required.
  const POSTS: ReadonlyArray<{
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    tags: string[];
    status: PostStatus;
    publishedAt: Date | null;
    byAdvisor: boolean;
    cover: string;
  }> = [
    {
      slug: "tarot-beginners-guide",
      title: "はじめてのタロット占い 完全ガイド",
      excerpt: "大アルカナ22枚の意味と、自分でできる三枚引きの手順をやさしく解説します。",
      category: "fortune-basics",
      tags: ["tarot", "beginner"],
      status: "PUBLISHED",
      publishedAt: new Date(now - 7 * 86400000),
      byAdvisor: true,
      cover: "/blog/cover-tarot.svg",
    },
    {
      slug: "2026-love-fortune",
      title: "2026年の恋愛運を高める3つの習慣",
      excerpt: "星の巡りを味方につけて、良縁を引き寄せる毎日の小さな習慣を紹介。",
      category: "love",
      tags: ["astrology", "love", "lucky-action"],
      status: "PUBLISHED",
      publishedAt: new Date(now - 3 * 86400000),
      byAdvisor: true,
      cover: "/blog/cover-star.svg",
    },
    {
      slug: "feng-shui-money-luck",
      title: "金運アップの風水 — 玄関と財布の整え方",
      excerpt: "今日からできる金運の風水。玄関・財布・水まわりのポイントをまとめました。",
      category: "money",
      tags: ["feng-shui", "lucky-action"],
      status: "PUBLISHED",
      publishedAt: new Date(now - 1 * 86400000),
      byAdvisor: false,
      cover: "/blog/cover-crystal.svg",
    },
    {
      slug: "numerology-life-path",
      title: "数秘術で読み解く、あなたのライフパスナンバー",
      excerpt: "生年月日から導く運命数で、本来の強みと向き合い方を知る。",
      category: "self",
      tags: ["numerology", "beginner"],
      status: "DRAFT",
      publishedAt: null,
      byAdvisor: true,
      cover: "/blog/cover-palm.svg",
    },
    {
      slug: "career-change-timing",
      title: "転職のベストタイミングを占いで見極める",
      excerpt: "迷ったときの判断軸に。運気の流れと現実的な準備の両立を考えます。",
      category: "work",
      tags: ["astrology"],
      status: "SCHEDULED",
      publishedAt: new Date(now + 5 * 86400000), // 未来 = 予約投稿
      byAdvisor: false,
      cover: "/blog/cover-moon.svg",
    },
    {
      slug: "old-campaign-notice",
      title: "【終了】春の鑑定キャンペーンのお知らせ",
      excerpt: "好評につき終了したキャンペーンのアーカイブ記事です。",
      category: "fortune-basics",
      tags: ["beginner"],
      status: "ARCHIVED",
      publishedAt: new Date(now - 60 * 86400000),
      byAdvisor: false,
      cover: "/blog/cover-tarot.svg",
    },
  ];

  let postCount = 0;
  for (const p of POSTS) {
    const categoryId = blogCatMap.get(p.category)!;
    const authorId =
      p.byAdvisor && firstAdvisorProfile
        ? firstAdvisorProfile.userId
        : admin.id;
    const advisorProfileId =
      p.byAdvisor && firstAdvisorProfile ? firstAdvisorProfile.id : null;

    const post = await prisma.blogPost.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        excerpt: p.excerpt,
        status: p.status,
        publishedAt: p.publishedAt,
        thumbnailUrl: p.cover,
      },
      create: {
        slug: p.slug,
        authorId,
        advisorProfileId,
        categoryId,
        title: p.title,
        excerpt: p.excerpt,
        thumbnailUrl: p.cover,
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: p.excerpt }],
            },
          ],
        },
        contentHtml: `<p>${p.excerpt}</p>`,
        status: p.status,
        publishedAt: p.publishedAt,
      },
    });

    for (const tagSlug of p.tags) {
      const tagId = blogTagMap.get(tagSlug);
      if (!tagId) continue;
      await prisma.blogPostTag.upsert({
        where: { postId_tagId: { postId: post.id, tagId } },
        update: {},
        create: { postId: post.id, tagId },
      });
    }
    postCount++;
  }

  console.log("✅ seed complete:");
  console.log(`   categories : ${CATEGORIES.length}`);
  console.log(`   devPrincipals : ${DEV_PRINCIPALS.length} (GENERAL/FT/ADMIN)`);
  console.log(`   advisors   : ${advisors.length}`);
  console.log(`   services   : ${serviceCount}`);
  console.log(`   reviews    : ${reviewCount}`);
  console.log(`   blogCats   : ${BLOG_CATEGORIES.length}`);
  console.log(`   blogTags   : ${BLOG_TAGS.length}`);
  console.log(`   posts      : ${postCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
