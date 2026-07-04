"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  BLOG_CATEGORIES,
  BLOG_CATEGORY_LABELS,
  type BlogCategory,
  type BlogPost,
} from "@/lib/blog";
import { AdminBlogRichTextEditor } from "@/components/admin/AdminBlogRichTextEditor";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import {
  createAdminBlogPost,
  deleteAdminBlogPost,
  fetchAdminBlogPosts,
  slugifyBlogTitle,
  updateAdminBlogPost,
  type BlogPostInput,
} from "@/lib/blogApi";

const EMPTY_FORM: BlogPostInput = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  authorName: "Huntlo Team",
  category: "playbooks",
  tags: [],
  status: "draft",
  seoTitle: "",
  seoDescription: "",
  ogImageUrl: "",
  featured: false,
};

type Props = {
  token: string;
};

export function AdminBlogPanel({ token }: Props) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogPostInput>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminBlogPosts(token, {
        status: statusFilter || undefined,
        limit: 50,
      });
      setPosts(data?.posts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSlugTouched(false);
  };

  const startCreate = () => {
    resetForm();
    setSuccess("");
  };

  const startEdit = (post: BlogPost) => {
    setEditingId(post.id);
    setSlugTouched(true);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      coverImageUrl: post.coverImageUrl,
      authorName: post.authorName,
      category: post.category as BlogCategory,
      tags: post.tags,
      status: post.status,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      ogImageUrl: post.ogImageUrl,
      featured: post.featured,
    });
    setSuccess("");
    setError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload: BlogPostInput = {
        ...form,
        tags: String(form.tags || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (!payload.title?.trim()) {
        throw new Error("Title is required");
      }
      if (editingId) {
        await updateAdminBlogPost(token, editingId, payload);
        setSuccess("Post updated.");
      } else {
        await createAdminBlogPost(token, payload);
        setSuccess("Post created.");
        resetForm();
      }
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this blog post permanently?")) return;
    setError("");
    setSuccess("");
    try {
      await deleteAdminBlogPost(token, id);
      if (editingId === id) resetForm();
      setSuccess("Post deleted.");
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <article className="dashboard-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="dashboard-section-title">Blog</h3>
          <p className="mt-1 dashboard-text-body">
            Create and publish articles at{" "}
            <Link href="/blog" className="text-[#0050cb] hover:underline" target="_blank">
              /blog
            </Link>
            . Use the rich text editor for headings, lists, links, and formatting.
          </p>
        </div>
        <button type="button" onClick={startCreate} className="dashboard-btn-secondary text-sm">
          New post
        </button>
      </div>

      {error ? <p className="mt-3 dashboard-alert-error">{error}</p> : null}
      {success ? <p className="mt-3 dashboard-alert-success">{success}</p> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="dashboard-input w-auto text-sm"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading posts…</p>
          ) : posts.length === 0 ? (
            <p className="text-sm text-slate-500">No posts yet.</p>
          ) : (
            <ul className="space-y-2">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{post.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        /blog/{post.slug} · {post.status}
                        {post.featured ? " · featured" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {post.status === "published" ? (
                        <Link
                          href={`/blog/${encodeURIComponent(post.slug)}`}
                          target="_blank"
                          className="dashboard-btn-secondary dashboard-btn-secondary--sm"
                        >
                          View
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => startEdit(post)}
                        className="dashboard-btn-secondary dashboard-btn-secondary--sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(post.id)}
                        className="dashboard-btn-secondary dashboard-btn-secondary--sm text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {editingId ? "Edit post" : "New post"}
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs text-slate-600">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => ({
                    ...f,
                    title,
                    ...(!slugTouched ? { slug: slugifyBlogTitle(title) } : {}),
                  }));
                }}
                className="mt-1 w-full dashboard-input"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Slug</label>
              <input
                type="text"
                value={form.slug || ""}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, slug: e.target.value }));
                }}
                className="mt-1 w-full dashboard-input"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-600">Category</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as BlogCategory }))
                  }
                  className="mt-1 w-full dashboard-input"
                >
                  {BLOG_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {BLOG_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as BlogPostInput["status"],
                    }))
                  }
                  className="mt-1 w-full dashboard-input"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-600">Excerpt</label>
              <textarea
                value={form.excerpt || ""}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                rows={2}
                className="mt-1 w-full dashboard-input"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Content</label>
              <div className="mt-1">
                <AdminBlogRichTextEditor
                  key={editingId || "new-post"}
                  editorKey={editingId || "new-post"}
                  value={form.content || ""}
                  onChange={(html) => setForm((f) => ({ ...f, content: html }))}
                  placeholder="Write your article…"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-600">Tags (comma-separated)</label>
              <input
                type="text"
                value={Array.isArray(form.tags) ? form.tags.join(", ") : ""}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value.split(",") }))}
                className="mt-1 w-full dashboard-input"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Cover image URL</label>
              <input
                type="url"
                value={form.coverImageUrl || ""}
                onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
                className="mt-1 w-full dashboard-input"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-600">SEO title</label>
                <input
                  type="text"
                  value={form.seoTitle || ""}
                  onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                  className="mt-1 w-full dashboard-input"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Author</label>
                <input
                  type="text"
                  value={form.authorName || ""}
                  onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
                  className="mt-1 w-full dashboard-input"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-600">SEO description</label>
              <textarea
                value={form.seoDescription || ""}
                onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
                rows={2}
                className="mt-1 w-full dashboard-input"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(form.featured)}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              />
              Featured on blog index
            </label>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="dashboard-btn-primary disabled:opacity-50"
              >
                <ButtonLoadingContent loading={saving} loadingLabel="Saving">
                  {editingId ? "Update post" : "Create post"}
                </ButtonLoadingContent>
              </button>
              {editingId ? (
                <button type="button" onClick={resetForm} className="dashboard-btn-secondary">
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
