export const BLOG_CATEGORIES = [
  "ai-sourcing",
  "outbound-recruiting",
  "people-scout",
  "hiring-os",
  "integrations",
  "product-updates",
  "playbooks",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_CATEGORY_LABELS: Record<BlogCategory, string> = {
  "ai-sourcing": "AI Sourcing",
  "outbound-recruiting": "Outbound Recruiting",
  "people-scout": "People Scout",
  "hiring-os": "Hiring OS",
  integrations: "Integrations",
  "product-updates": "Product Updates",
  playbooks: "Playbooks",
};

export type BlogPostSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string;
  authorName: string;
  authorAvatarUrl: string;
  category: BlogCategory;
  tags: string[];
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  readTimeMinutes: number;
  featured: boolean;
  viewCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type BlogPost = BlogPostSummary & {
  content: string;
};

export type BlogPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export function blogCategoryLabel(category: string): string {
  return BLOG_CATEGORY_LABELS[category as BlogCategory] || category;
}

export function formatBlogDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function fetchPublicBlogPosts(options?: {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  q?: string;
}): Promise<{
  posts: BlogPostSummary[];
  featured: BlogPostSummary | null;
  pagination: BlogPagination;
} | null> {
  const q = new URLSearchParams();
  if (options?.page) q.set("page", String(options.page));
  if (options?.limit) q.set("limit", String(options.limit));
  if (options?.category?.trim()) q.set("category", options.category.trim());
  if (options?.tag?.trim()) q.set("tag", options.tag.trim());
  if (options?.q?.trim()) q.set("q", options.q.trim());
  const qs = q.toString();

  try {
    const res = await fetch(`${apiBase()}/api/blog/posts${qs ? `?${qs}` : ""}`, {
      next: { revalidate: 60 },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) return null;
    return {
      posts: Array.isArray(data.posts) ? data.posts : [],
      featured: data.featured ?? null,
      pagination: data.pagination ?? {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 1,
        hasMore: false,
      },
    };
  } catch {
    return null;
  }
}

export async function fetchPublicBlogPost(
  slug: string
): Promise<{ post: BlogPost; relatedPosts: BlogPostSummary[] } | null> {
  const key = slug.trim();
  if (!key) return null;
  try {
    const res = await fetch(`${apiBase()}/api/blog/posts/${encodeURIComponent(key)}`, {
      next: { revalidate: 60 },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !data.post) return null;
    return {
      post: data.post as BlogPost,
      relatedPosts: Array.isArray(data.relatedPosts) ? data.relatedPosts : [],
    };
  } catch {
    return null;
  }
}

export async function fetchBlogSitemapEntries(): Promise<
  { slug: string; updatedAt: string }[]
> {
  try {
    const res = await fetch(`${apiBase()}/api/blog/sitemap`, { next: { revalidate: 300 } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !Array.isArray(data.posts)) return [];
    return data.posts;
  } catch {
    return [];
  }
}
