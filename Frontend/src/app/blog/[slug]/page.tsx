import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogArticleBody } from "@/components/blog/BlogArticleBody";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { blogCategoryLabel, fetchPublicBlogPost, formatBlogDate } from "@/lib/blog";
import { absoluteOgImage, buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPublicBlogPost(slug);
  if (!data?.post) {
    return { title: "Article not found | Huntlo Blog" };
  }
  const { post } = data;
  const title = post.seoTitle?.trim() || post.title;
  const description = post.seoDescription?.trim() || post.excerpt;
  const postImage = post.ogImageUrl?.trim() || post.coverImageUrl?.trim() || "";
  const ogImage = postImage || absoluteOgImage(OG_IMAGES.blog);
  const meta = buildPageMetadata({
    title: `${title} | Huntlo Blog`,
    description,
    ogImage: postImage || OG_IMAGES.blog,
    path: `/blog/${slug}`,
  });

  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      type: "article",
      publishedTime: post.publishedAt || undefined,
      images: [{ url: ogImage, alt: title }],
    },
    twitter: {
      ...meta.twitter,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await fetchPublicBlogPost(slug);
  if (!data?.post) notFound();

  const { post, relatedPosts } = data;
  const ogImage = post.coverImageUrl?.trim();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || post.seoDescription,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { "@type": "Organization", name: post.authorName || "Huntlo" },
    ...(ogImage ? { image: [ogImage] } : {}),
  };

  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />

      <main className="px-4 py-8 md:px-8 md:py-12 lg:px-12">
        <article className="mx-auto w-full max-w-3xl">
          <nav className="mb-6 text-sm text-[#434654]" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[#0050cb]">
              Home
            </Link>
            <span className="mx-2 text-[#c3c6d6]">/</span>
            <Link href="/blog" className="hover:text-[#0050cb]">
              Blog
            </Link>
            <span className="mx-2 text-[#c3c6d6]">/</span>
            <span className="text-[#141b2b]">{post.title}</span>
          </nav>

          <header className="landing-blog-article-header">
            <div className="landing-blog-card-meta landing-blog-card-meta--article">
              <span className="landing-blog-chip">{blogCategoryLabel(post.category)}</span>
              {post.publishedAt ? (
                <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
              ) : null}
              <span>{post.readTimeMinutes} min read</span>
            </div>
            <h1 className="landing-blog-article-title">{post.title}</h1>
            {post.excerpt ? (
              <p className="landing-blog-article-excerpt">{post.excerpt}</p>
            ) : null}
            <p className="text-sm text-[#434654]">By {post.authorName || "Huntlo Team"}</p>
          </header>

          {ogImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ogImage}
              alt=""
              className="landing-blog-article-cover"
            />
          ) : null}

          <BlogArticleBody html={post.content} />

          <footer className="landing-blog-article-footer mt-10 border-t border-[#c3c6d6]/35 pt-8">
            {post.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="landing-blog-tag">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup" className="dashboard-btn-primary text-sm">
                Start Free Trial
              </Link>
              <Link href="/blog" className="dashboard-btn-secondary text-sm">
                <MaterialIcon name="arrow_back" className="text-sm" />
                All articles
              </Link>
            </div>
          </footer>
        </article>

        {relatedPosts.length > 0 ? (
          <section className="mx-auto mt-16 w-full max-w-7xl">
            <h2 className="text-lg font-semibold text-[#141b2b] md:text-xl">Related articles</h2>
            <div className="landing-blog-grid mt-6">
              {relatedPosts.map((related) => (
                <BlogPostCard key={related.id} post={related} />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <LandingFooter />
    </div>
  );
}
