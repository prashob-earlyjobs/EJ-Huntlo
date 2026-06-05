const mongoose = require("mongoose");

const BLOG_CATEGORIES = [
  "ai-sourcing",
  "outbound-recruiting",
  "people-scout",
  "hiring-os",
  "integrations",
  "product-updates",
  "playbooks",
];

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 220 },
    excerpt: { type: String, default: "", maxlength: 500 },
    content: { type: String, default: "" },
    coverImageUrl: { type: String, default: "", trim: true, maxlength: 2000 },
    authorName: { type: String, default: "Huntlo Team", trim: true, maxlength: 120 },
    authorAvatarUrl: { type: String, default: "", trim: true, maxlength: 2000 },
    category: {
      type: String,
      enum: BLOG_CATEGORIES,
      default: "playbooks",
      index: true,
    },
    tags: [{ type: String, trim: true, maxlength: 60 }],
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    publishedAt: { type: Date, default: null, index: true },
    seoTitle: { type: String, default: "", maxlength: 200 },
    seoDescription: { type: String, default: "", maxlength: 320 },
    ogImageUrl: { type: String, default: "", trim: true, maxlength: 2000 },
    readTimeMinutes: { type: Number, default: 1, min: 1 },
    featured: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ status: 1, featured: -1, publishedAt: -1 });

module.exports = mongoose.model("BlogPost", blogPostSchema);
module.exports.BLOG_CATEGORIES = BLOG_CATEGORIES;
