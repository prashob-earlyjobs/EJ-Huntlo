import type { MetadataRoute } from "next";

import { fetchBlogSitemapEntries } from "@/lib/blog";
import { COMPARISON_HUB_ENTRIES } from "@/lib/comparisons";
import { listSolutionPages } from "@/lib/solutionPages";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.huntlo.ai";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPosts = await fetchBlogSitemapEntries();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/sourcing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/screening`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/assessments`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/interview`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/people-scout`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.88 },
    { url: `${SITE_URL}/candidate-pool`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.88 },
    { url: `${SITE_URL}/integrations`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.88 },
    { url: `${SITE_URL}/platform`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/solutions`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/resources`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${SITE_URL}/docs`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/compare`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/faqs`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/book-a-demo`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/demo`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${encodeURIComponent(post.slug)}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const compareRoutes: MetadataRoute.Sitemap = COMPARISON_HUB_ENTRIES.map((entry) => ({
    url: `${SITE_URL}${entry.href}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.82,
  }));

  const solutionRoutes: MetadataRoute.Sitemap = listSolutionPages().map((page) => ({
    url: `${SITE_URL}${page.href}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.85,
  }));

  return [...staticRoutes, ...solutionRoutes, ...blogRoutes, ...compareRoutes];
}
