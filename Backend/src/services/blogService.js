const BlogPost = require("../models/BlogPost");
const { BLOG_CATEGORIES } = require("../models/BlogPost");

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugifyTitle(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

function normalizeSlug(raw, fallbackTitle = "") {
  const fromRaw = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
  const slug = fromRaw || slugifyTitle(fallbackTitle);
  if (!slug || !SLUG_PATTERN.test(slug)) {
    const err = new Error("Invalid slug. Use lowercase letters, numbers, and hyphens.");
    err.statusCode = 400;
    throw err;
  }
  return slug;
}

function normalizeTags(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const tag = String(item || "").trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag.slice(0, 60));
    if (out.length >= 12) break;
  }
  return out;
}

function computeReadTimeMinutes(content) {
  const text = String(content || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

function formatPost(doc, { includeContent = false } = {}) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const publishedAt = o.publishedAt ? new Date(o.publishedAt).toISOString() : null;
  return {
    id: String(o._id),
    title: o.title || "",
    slug: o.slug || "",
    excerpt: o.excerpt || "",
    ...(includeContent ? { content: o.content || "" } : {}),
    coverImageUrl: o.coverImageUrl || "",
    authorName: o.authorName || "Huntlo Team",
    authorAvatarUrl: o.authorAvatarUrl || "",
    category: o.category || "playbooks",
    tags: Array.isArray(o.tags) ? o.tags : [],
    status: o.status || "draft",
    publishedAt,
    seoTitle: o.seoTitle || "",
    seoDescription: o.seoDescription || "",
    ogImageUrl: o.ogImageUrl || "",
    readTimeMinutes: Math.max(1, Number(o.readTimeMinutes) || 1),
    featured: Boolean(o.featured),
    viewCount: Math.max(0, Number(o.viewCount) || 0),
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
    updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : null,
  };
}

function buildListFilter({ category, tag, q, status }) {
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = String(category).trim();
  if (tag) filter.tags = String(tag).trim().toLowerCase();
  const query = String(q || "").trim();
  if (query) {
    filter.$or = [
      { title: { $regex: query, $options: "i" } },
      { excerpt: { $regex: query, $options: "i" } },
      { tags: { $regex: query, $options: "i" } },
    ];
  }
  return filter;
}

async function ensureUniqueSlug(baseSlug, excludeId = null) {
  let slug = baseSlug;
  let suffix = 0;
  while (true) {
    const filter = { slug };
    if (excludeId) filter._id = { $ne: excludeId };
    const exists = await BlogPost.exists(filter);
    if (!exists) return slug;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`.slice(0, 220);
  }
}

function normalizePostInput(body, { isCreate = false } = {}) {
  const title = String(body?.title || "").trim();
  if (isCreate && !title) {
    const err = new Error("title is required");
    err.statusCode = 400;
    throw err;
  }

  const patch = {};
  if (title) patch.title = title.slice(0, 200);
  if (body?.slug !== undefined || isCreate) {
    patch.slug = normalizeSlug(body?.slug, title);
  }
  if (body?.excerpt !== undefined) patch.excerpt = String(body.excerpt || "").slice(0, 500);
  if (body?.content !== undefined) patch.content = String(body.content || "");
  if (body?.coverImageUrl !== undefined) {
    patch.coverImageUrl = String(body.coverImageUrl || "").trim().slice(0, 2000);
  }
  if (body?.authorName !== undefined) {
    patch.authorName = String(body.authorName || "Huntlo Team").trim().slice(0, 120);
  }
  if (body?.authorAvatarUrl !== undefined) {
    patch.authorAvatarUrl = String(body.authorAvatarUrl || "").trim().slice(0, 2000);
  }
  if (body?.category !== undefined) {
    const category = String(body.category || "playbooks").trim();
    if (!BLOG_CATEGORIES.includes(category)) {
      const err = new Error(`category must be one of: ${BLOG_CATEGORIES.join(", ")}`);
      err.statusCode = 400;
      throw err;
    }
    patch.category = category;
  }
  if (body?.tags !== undefined) patch.tags = normalizeTags(body.tags);
  if (body?.seoTitle !== undefined) patch.seoTitle = String(body.seoTitle || "").slice(0, 200);
  if (body?.seoDescription !== undefined) {
    patch.seoDescription = String(body.seoDescription || "").slice(0, 320);
  }
  if (body?.ogImageUrl !== undefined) {
    patch.ogImageUrl = String(body.ogImageUrl || "").trim().slice(0, 2000);
  }
  if (body?.featured !== undefined) patch.featured = Boolean(body.featured);
  if (body?.status !== undefined) {
    const status = String(body.status || "draft").trim();
    if (!["draft", "published", "archived"].includes(status)) {
      const err = new Error("status must be draft, published, or archived");
      err.statusCode = 400;
      throw err;
    }
    patch.status = status;
    if (status === "published" && body?.publishedAt) {
      const d = new Date(body.publishedAt);
      if (!Number.isNaN(d.getTime())) patch.publishedAt = d;
    } else if (status === "published" && isCreate) {
      patch.publishedAt = new Date();
    } else if (status !== "published") {
      patch.publishedAt = null;
    }
  }
  if (patch.content !== undefined || isCreate) {
    patch.readTimeMinutes = computeReadTimeMinutes(
      patch.content !== undefined ? patch.content : body?.content
    );
  }
  return patch;
}

async function listPublicPosts(options = {}) {
  const pageRaw = Number(options.page);
  const limitRaw = Number(options.limit);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit = Math.min(24, Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 12));
  const skip = (page - 1) * limit;

  const filter = buildListFilter({
    category: options.category,
    tag: options.tag,
    q: options.q,
    status: "published",
  });

  const [docs, total, featuredDoc] = await Promise.all([
    BlogPost.find(filter).sort({ publishedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    BlogPost.countDocuments(filter),
    options.includeFeatured && page === 1 && !options.category && !options.tag && !options.q
      ? BlogPost.findOne({ status: "published", featured: true })
          .sort({ publishedAt: -1 })
          .lean()
      : null,
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  return {
    posts: docs.map((d) => formatPost(d)),
    featured: featuredDoc ? formatPost(featuredDoc) : null,
    pagination: {
      page: Math.min(page, totalPages),
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

async function getPublicPostBySlug(slug) {
  const key = String(slug || "").trim();
  if (!key) {
    const err = new Error("slug is required");
    err.statusCode = 400;
    throw err;
  }

  const doc = await BlogPost.findOneAndUpdate(
    { slug: key, status: "published" },
    { $inc: { viewCount: 1 } },
    { new: true }
  ).lean();

  if (!doc) {
    const err = new Error("Blog post not found");
    err.statusCode = 404;
    throw err;
  }

  const related = await BlogPost.find({
    status: "published",
    category: doc.category,
    _id: { $ne: doc._id },
  })
    .sort({ publishedAt: -1 })
    .limit(3)
    .lean();

  return {
    post: formatPost(doc, { includeContent: true }),
    relatedPosts: related.map((d) => formatPost(d)),
  };
}

async function listAdminPosts(options = {}) {
  const pageRaw = Number(options.page);
  const limitRaw = Number(options.limit);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 20));
  const skip = (page - 1) * limit;

  const filter = buildListFilter({
    category: options.category,
    tag: options.tag,
    q: options.q,
    status: options.status,
  });

  const [docs, total] = await Promise.all([
    BlogPost.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    BlogPost.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  return {
    posts: docs.map((d) => formatPost(d, { includeContent: true })),
    pagination: {
      page: Math.min(page, totalPages),
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

async function getAdminPostById(postId) {
  const doc = await BlogPost.findById(postId);
  if (!doc) {
    const err = new Error("Blog post not found");
    err.statusCode = 404;
    throw err;
  }
  return formatPost(doc, { includeContent: true });
}

async function createPost(body) {
  const patch = normalizePostInput(body, { isCreate: true });
  patch.slug = await ensureUniqueSlug(patch.slug);
  if (patch.status === "published" && !patch.publishedAt) {
    patch.publishedAt = new Date();
  }
  const doc = await BlogPost.create(patch);
  return formatPost(doc, { includeContent: true });
}

async function updatePost(postId, body) {
  const doc = await BlogPost.findById(postId);
  if (!doc) {
    const err = new Error("Blog post not found");
    err.statusCode = 404;
    throw err;
  }

  const patch = normalizePostInput(body, { isCreate: false });
  if (patch.slug) {
    patch.slug = await ensureUniqueSlug(patch.slug, doc._id);
  }
  if (patch.status === "published" && !doc.publishedAt && !patch.publishedAt) {
    patch.publishedAt = new Date();
  }
  if (patch.status && patch.status !== "published") {
    patch.publishedAt = null;
  }

  Object.assign(doc, patch);
  await doc.save();
  return formatPost(doc, { includeContent: true });
}

async function deletePost(postId) {
  const doc = await BlogPost.findByIdAndDelete(postId);
  if (!doc) {
    const err = new Error("Blog post not found");
    err.statusCode = 404;
    throw err;
  }
  return { deleted: true, id: String(doc._id) };
}

async function listPublishedSlugs() {
  const docs = await BlogPost.find({ status: "published" })
    .select("slug updatedAt publishedAt")
    .sort({ publishedAt: -1 })
    .lean();
  return docs.map((d) => ({
    slug: d.slug,
    updatedAt: (d.updatedAt || d.publishedAt || new Date()).toISOString(),
  }));
}

module.exports = {
  listPublicPosts,
  getPublicPostBySlug,
  listAdminPosts,
  getAdminPostById,
  createPost,
  updatePost,
  deletePost,
  listPublishedSlugs,
  slugifyTitle,
};
