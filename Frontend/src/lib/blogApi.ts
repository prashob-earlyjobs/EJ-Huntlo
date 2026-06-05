import { authHeaders } from "@/lib/auth";
import type { BlogCategory, BlogPost, BlogPostSummary, BlogPagination } from "@/lib/blog";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type BlogPostInput = {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImageUrl?: string;
  authorName?: string;
  authorAvatarUrl?: string;
  category?: BlogCategory;
  tags?: string[];
  status?: "draft" | "published" | "archived";
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
  featured?: boolean;
};

export async function fetchAdminBlogPosts(
  token: string,
  options?: { page?: number; limit?: number; status?: string; q?: string }
): Promise<{ posts: BlogPost[]; pagination: BlogPagination; categories: string[] } | null> {
  const q = new URLSearchParams();
  if (options?.page) q.set("page", String(options.page));
  if (options?.limit) q.set("limit", String(options.limit));
  if (options?.status?.trim()) q.set("status", options.status.trim());
  if (options?.q?.trim()) q.set("q", options.q.trim());
  const qs = q.toString();

  const res = await fetch(`${apiBase()}/api/blog/admin/posts${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to load blog posts");
  }
  return {
    posts: Array.isArray(data.posts) ? data.posts : [],
    pagination: data.pagination,
    categories: Array.isArray(data.categories) ? data.categories : [],
  };
}

export async function createAdminBlogPost(
  token: string,
  input: BlogPostInput
): Promise<BlogPost> {
  const res = await fetch(`${apiBase()}/api/blog/admin/posts`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to create post");
  }
  return data.post as BlogPost;
}

export async function updateAdminBlogPost(
  token: string,
  id: string,
  input: Partial<BlogPostInput>
): Promise<BlogPost> {
  const res = await fetch(`${apiBase()}/api/blog/admin/posts/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to update post");
  }
  return data.post as BlogPost;
}

export async function deleteAdminBlogPost(token: string, id: string): Promise<void> {
  const res = await fetch(`${apiBase()}/api/blog/admin/posts/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to delete post");
  }
}

export function slugifyBlogTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

export type { BlogPostSummary };
