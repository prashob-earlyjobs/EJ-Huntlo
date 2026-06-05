const mongoose = require("mongoose");
const { BLOG_CATEGORIES } = require("../models/BlogPost");
const {
  listPublicPosts,
  getPublicPostBySlug,
  listAdminPosts,
  getAdminPostById,
  createPost,
  updatePost,
  deletePost,
  listPublishedSlugs,
} = require("../services/blogService");

function handleError(res, error) {
  const status = error.statusCode && Number.isFinite(error.statusCode) ? error.statusCode : 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Request failed",
  });
}

const listPublicPostsHandler = async (req, res) => {
  try {
    const result = await listPublicPosts({
      page: req.query.page,
      limit: req.query.limit,
      category: req.query.category,
      tag: req.query.tag,
      q: req.query.q,
      includeFeatured: req.query.featured !== "0",
    });
    return res.status(200).json({
      success: true,
      categories: BLOG_CATEGORIES,
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPublicPostHandler = async (req, res) => {
  try {
    const result = await getPublicPostBySlug(req.params.slug);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const listSitemapPostsHandler = async (_req, res) => {
  try {
    const slugs = await listPublishedSlugs();
    return res.status(200).json({ success: true, posts: slugs });
  } catch (error) {
    return handleError(res, error);
  }
};

const listAdminPostsHandler = async (req, res) => {
  try {
    const result = await listAdminPosts({
      page: req.query.page,
      limit: req.query.limit,
      category: req.query.category,
      tag: req.query.tag,
      q: req.query.q,
      status: req.query.status,
    });
    return res.status(200).json({
      success: true,
      categories: BLOG_CATEGORIES,
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getAdminPostHandler = async (req, res) => {
  try {
    const post = await getAdminPostById(req.params.id);
    return res.status(200).json({ success: true, post });
  } catch (error) {
    return handleError(res, error);
  }
};

const createPostHandler = async (req, res) => {
  try {
    const post = await createPost(req.body);
    return res.status(201).json({ success: true, post });
  } catch (error) {
    return handleError(res, error);
  }
};

const updatePostHandler = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid post id" });
    }
    const post = await updatePost(req.params.id, req.body);
    return res.status(200).json({ success: true, post });
  } catch (error) {
    return handleError(res, error);
  }
};

const deletePostHandler = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid post id" });
    }
    const result = await deletePost(req.params.id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  listPublicPostsHandler,
  getPublicPostHandler,
  listSitemapPostsHandler,
  listAdminPostsHandler,
  getAdminPostHandler,
  createPostHandler,
  updatePostHandler,
  deletePostHandler,
};
