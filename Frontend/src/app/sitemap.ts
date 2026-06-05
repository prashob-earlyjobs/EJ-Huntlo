import type { MetadataRoute } from "next";

import { fetchBlogSitemapEntries } from "@/lib/blog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://huntlo.ai";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPosts = await fetchBlogSitemapEntries();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/compare`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${SITE_URL}/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${encodeURIComponent(post.slug)}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...blogRoutes];
}
