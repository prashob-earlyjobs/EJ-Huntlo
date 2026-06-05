const express = require("express");
const { authenticate, requireAdmin } = require("../middleware/auth");
const {
  listPublicPostsHandler,
  getPublicPostHandler,
  listSitemapPostsHandler,
  listAdminPostsHandler,
  getAdminPostHandler,
  createPostHandler,
  updatePostHandler,
  deletePostHandler,
} = require("../controllers/blogController");

const router = express.Router();

router.get("/posts", listPublicPostsHandler);
router.get("/posts/:slug", getPublicPostHandler);
router.get("/sitemap", listSitemapPostsHandler);

router.get("/admin/posts", authenticate, requireAdmin, listAdminPostsHandler);
router.get("/admin/posts/:id", authenticate, requireAdmin, getAdminPostHandler);
router.post("/admin/posts", authenticate, requireAdmin, createPostHandler);
router.put("/admin/posts/:id", authenticate, requireAdmin, updatePostHandler);
router.delete("/admin/posts/:id", authenticate, requireAdmin, deletePostHandler);

module.exports = router;
