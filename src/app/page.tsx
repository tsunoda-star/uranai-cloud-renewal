import {
  getHomeStats,
  getCategories,
  getFeaturedAdvisors,
  getFeaturedServices,
  getLatestPosts,
  getRecentActivity,
} from "@/lib/queries";
import {
  jsonLdString,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/jsonld";
import { siteConfig } from "@/lib/site";
import { Hero } from "@/components/home/hero";
import { StatBand } from "@/components/home/stat-band";
import { CategoryCard } from "@/components/home/category-card";
import { FortuneTellerCard } from "@/components/home/fortune-teller-card";
import { ServiceCard } from "@/components/home/service-card";
import { BlogCard } from "@/components/home/blog-card";
import { CtaThreeStep } from "@/components/home/cta-three-step";
import { SectionHeading } from "@/components/home/section-heading";
import { FadeIn } from "@/components/home/fade-in";
import { LiveTicker } from "@/components/home/live-ticker";

/**
 * Home page (Wave 2).
 *
 * Layout rhythm (LAY-8): full-bleed Hero -> orange-pale StatBand -> CategoryGrid
 * -> 3-step CTA -> pickup advisors -> latest blog. Every list / number below is a
 * live PostgreSQL read (seed dataset) — no mock data.
 *
 * Rendered dynamically so the homepage always reflects current DB state.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [stats, categories, advisors, services, posts, activity] =
    await Promise.all([
      getHomeStats(),
      getCategories(),
      getFeaturedAdvisors(4),
      getFeaturedServices(3),
      getLatestPosts(3),
      getRecentActivity(12),
    ]);

  const categoryOptions = categories.map((c) => ({
    slug: c.slug,
    label: c.name,
  }));
  const popularCategories = categories.slice(0, 6);

  // Site-wide structured data (SEO-11): Organization + WebSite(SearchAction).
  const organizationLd = organizationJsonLd({
    name: siteConfig.name,
    description: siteConfig.description,
  });
  const websiteLd = websiteJsonLd({
    name: siteConfig.name,
    description: siteConfig.description,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(organizationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(websiteLd) }}
      />

      <LiveTicker items={activity} />

      <Hero categories={categoryOptions} popularCategories={popularCategories} />

      <StatBand stats={stats} />

      {/* Category grid */}
      <section aria-labelledby="categories-heading" className="bg-background">
        <div className="mx-auto max-w-container px-4 py-16 sm:px-6 lg:py-24">
          <SectionHeading
            headingId="categories-heading"
            eyebrow="Divination"
            title="占術から探す"
            description="気になる占術を選んで、得意な占い師を見つけましょう。"
            moreHref="/advisors"
            moreLabel="すべての占い師を見る"
          />
          <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category, i) => (
              <FadeIn as="li" variant="scroll" index={Math.min(i, 6)} key={category.slug}>
                <CategoryCard category={category} />
              </FadeIn>
            ))}
          </ul>
        </div>
      </section>

      <CtaThreeStep />

      {/* Pickup advisors */}
      {advisors.length > 0 && (
        <section aria-labelledby="advisors-heading" className="bg-gray-50">
          <div className="mx-auto max-w-container px-4 py-16 sm:px-6 lg:py-24">
            <SectionHeading
              headingId="advisors-heading"
              eyebrow="Pickup"
              title="注目の占い師"
              description="高い評価をいただいている占い師をご紹介します。"
              moreHref="/advisors"
              moreLabel="占い師一覧へ"
            />
            <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {advisors.map((advisor, i) => (
                <FadeIn as="li" variant="scroll" index={Math.min(i, 6)} key={advisor.slug}>
                  <FortuneTellerCard advisor={advisor} />
                </FadeIn>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Pickup services */}
      {services.length > 0 && (
        <section aria-labelledby="services-heading" className="bg-background">
          <div className="mx-auto max-w-container px-4 py-16 sm:px-6 lg:py-24">
            <SectionHeading
              headingId="services-heading"
              eyebrow="Menu"
              title="人気の鑑定メニュー"
              description="形式・価格・所要時間で比較して、ぴったりの鑑定を。"
              moreHref="/services"
              moreLabel="鑑定メニュー一覧へ"
            />
            <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service, i) => (
                <FadeIn as="li" variant="scroll" index={Math.min(i, 6)} key={service.id}>
                  <ServiceCard service={service} />
                </FadeIn>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Latest blog */}
      {posts.length > 0 && (
        <section aria-labelledby="blog-heading" className="bg-gray-50">
          <div className="mx-auto max-w-container px-4 py-16 sm:px-6 lg:py-24">
            <SectionHeading
              headingId="blog-heading"
              eyebrow="Column"
              title="新着コラム"
              description="占いの基礎から開運のヒントまで、読み物をお届け。"
              moreHref="/blog"
              moreLabel="ブログ一覧へ"
            />
            <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <FadeIn as="li" variant="scroll" index={Math.min(i, 6)} key={post.slug}>
                  <BlogCard post={post} />
                </FadeIn>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
