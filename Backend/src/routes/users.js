const express = require("express");
const {
  registerUser,
  loginUser,
  listUsers,
  logoutUser,
  createUserByAdmin,
  updateUserCredits,
  getMyCreditHistory,
  getMyUtilisationHistory,
  getUserCreditHistory,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
} = require("../controllers/userController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", authenticate, logoutUser);
router.get("/me", authenticate, getMyProfile);
router.patch("/me", authenticate, updateMyProfile);
router.patch("/me/password", authenticate, changeMyPassword);

router.get("/me/credits/history", authenticate, getMyCreditHistory);
router.get("/me/utilisation/history", authenticate, getMyUtilisationHistory);

router.patch(
  "/:id/credits",
  authenticate,
  requireAdmin,
  updateUserCredits
);
router.get(
  "/:id/credits/history",
  authenticate,
  requireAdmin,
  getUserCreditHistory
);
router.post("/admin/create", authenticate, requireAdmin, createUserByAdmin);
router.get("/", authenticate, requireAdmin, listUsers);

module.exports = router;
