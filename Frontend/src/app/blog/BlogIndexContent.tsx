"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BlogCategoryNav } from "@/components/blog/BlogCategoryNav";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  blogCategoryLabel,
  fetchPublicBlogPosts,
  type BlogPagination,
  type BlogPostSummary,
} from "@/lib/blog";

type BlogIndexData = {
  posts: BlogPostSummary[];
  featured: BlogPostSummary | null;
  pagination: BlogPagination;
} | null;

export function BlogIndexContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category")?.trim() || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const [data, setData] = useState<BlogIndexData>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void fetchPublicBlogPosts({ page, limit: 12, category: category || undefined })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category, page]);

  const posts = data?.posts ?? [];
  const featured = data?.featured && page === 1 && !category ? data.featured : null;
  const gridPosts = featured ? posts.filter((p) => p.id !== featured.id) : posts;
  const pagination = data?.pagination;
  const categoryLabel = category ? blogCategoryLabel(category) : "";

  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingNav />

      <main className="px-4 py-10 md:px-8 md:py-14 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <header className="landing-blog-header">
            <p className="landing-blog-eyebrow">Resources</p>
            <h1 className="landing-blog-title">
              {categoryLabel ? `${categoryLabel} articles` : "Huntlo blog"}
            </h1>
            <p className="landing-blog-subtitle">
              Playbooks for AI sourcing, outbound recruiting, and building a modern hiring OS.
            </p>
          </header>

          <BlogCategoryNav activeCategory={category} />

          {loading ? (
            <div className="py-16 text-center">
              <MaterialIcon name="hourglass_empty" className="mx-auto text-3xl text-[#0050cb]" />
              <p className="mt-3 text-sm text-[#434654]">Loading articles…</p>
            </div>
          ) : !data ? (
            <div className="py-16 text-center">
              <MaterialIcon name="cloud_off" className="mx-auto text-3xl text-[#434654]" />
              <p className="mt-3 text-sm text-[#434654]">Could not load blog posts. Try again later.</p>
            </div>
          ) : posts.length === 0 && !featured ? (
            <div className="py-16 text-center">
              <MaterialIcon name="article" className="mx-auto text-3xl text-[#0050cb]" />
              <p className="mt-3 text-sm text-[#434654]">No articles published yet.</p>
              <Link href="/" className="dashboard-btn-primary mt-4 inline-flex text-sm">
                Back to home
              </Link>
            </div>
          ) : (
            <div className="mt-8 space-y-10">
              {featured ? (
                <section aria-label="Featured article">
                  <BlogPostCard post={featured} variant="featured" />
                </section>
              ) : null}

              {gridPosts.length > 0 ? (
                <section
                  className="landing-blog-grid"
                  aria-label={categoryLabel ? `${categoryLabel} articles` : "All articles"}
                >
                  {gridPosts.map((post) => (
                    <BlogPostCard key={post.id} post={post} />
                  ))}
                </section>
              ) : null}

              {pagination && pagination.totalPages > 1 ? (
                <nav
                  className="flex flex-wrap items-center justify-center gap-3 pt-4"
                  aria-label="Blog pagination"
                >
                  {page > 1 ? (
                    <Link
                      href={`/blog?${new URLSearchParams({
                        ...(category ? { category } : {}),
                        page: String(page - 1),
                      }).toString()}`}
                      className="dashboard-btn-secondary text-sm"
                    >
                      Previous
                    </Link>
                  ) : null}
                  <span className="text-sm text-[#434654]">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  {pagination.hasMore ? (
                    <Link
                      href={`/blog?${new URLSearchParams({
                        ...(category ? { category } : {}),
                        page: String(page + 1),
                      }).toString()}`}
                      className="dashboard-btn-secondary text-sm"
                    >
                      Next
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </div>
          )}

          <section className="landing-blog-cta mt-16 rounded-2xl border border-[#c3c6d6]/35 bg-white p-8 text-center shadow-sm md:p-10">
            <h2 className="text-xl font-semibold text-[#141b2b] md:text-2xl">
              Ready to source your next hire?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#434654] md:text-base">
              Describe who you need in plain English and preview matching candidates in seconds.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link href="/" className="dashboard-btn-primary text-sm">
                Try AI search
              </Link>
              <Link href="/signup" className="dashboard-btn-secondary text-sm">
                Create account
              </Link>
            </div>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
