const express = require("express");
const {
  registerUser,
  loginUser,
  listUsers,
  logoutUser,
  createUserByAdmin,
  updateUserCredits,
  updateUserPlan,
  getMyCreditHistory,
  getMyUtilisationHistory,
  getAllUtilisationHistory,
  getUserCreditHistory,
  getUserUtilisationHistory,
  getUserPlanHistory,
  getUserPlanDetails,
  getMyProfile,
  updateMyProfile,
  uploadMyProfilePhoto,
  removeMyProfilePhoto,
  completeMyOnboarding,
  changeMyPassword,
  resetUserPasswordByAdmin,
} = require("../controllers/userController");
const {
  getUsageAnalyticsSummary,
  getUsageAnalyticsEvents,
} = require("../controllers/usageAnalyticsController");
const { getMyDashboard } = require("../controllers/dashboardController");
const {
  getMyTeam,
  createTeamMember,
  updateTeamMember,
  resetTeamMemberPassword,
  getTeamUtilisationHistory,
  getTeamActivity,
  listOrganizationsAdmin,
} = require("../controllers/teamController");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { profilePhotoUpload } = require("../middleware/profilePhotoUpload");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", authenticate, logoutUser);
router.get("/me", authenticate, getMyProfile);
router.get("/me/dashboard", authenticate, getMyDashboard);
router.patch("/me", authenticate, updateMyProfile);
router.post(
  "/me/photo",
  authenticate,
  (req, res, next) => {
    profilePhotoUpload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Invalid photo upload",
        });
      }
      next();
    });
  },
  uploadMyProfilePhoto
);
router.delete("/me/photo", authenticate, removeMyProfilePhoto);
router.patch("/me/onboarding", authenticate, completeMyOnboarding);
router.patch("/me/password", authenticate, changeMyPassword);

router.get("/me/team", authenticate, getMyTeam);
router.post("/me/team/members", authenticate, createTeamMember);
router.patch("/me/team/members/:memberId", authenticate, updateTeamMember);
router.post(
  "/me/team/members/:memberId/reset-password",
  authenticate,
  resetTeamMemberPassword
);
router.get("/me/team/utilisation", authenticate, getTeamUtilisationHistory);
router.get("/me/team/activity", authenticate, getTeamActivity);
router.get(
  "/admin/organizations",
  authenticate,
  requireAdmin,
  listOrganizationsAdmin
);

router.get("/me/credits/history", authenticate, getMyCreditHistory);
router.get("/me/utilisation/history", authenticate, getMyUtilisationHistory);
router.get(
  "/admin/utilisation/history",
  authenticate,
  requireAdmin,
  getAllUtilisationHistory
);
router.get(
  "/admin/usage-analytics/summary",
  authenticate,
  requireAdmin,
  getUsageAnalyticsSummary
);
router.get(
  "/admin/usage-analytics/events",
  authenticate,
  requireAdmin,
  getUsageAnalyticsEvents
);

router.patch(
  "/:id/credits",
  authenticate,
  requireAdmin,
  updateUserCredits
);
router.patch(
  "/:id/plan",
  authenticate,
  requireAdmin,
  updateUserPlan
);
router.post(
  "/:id/reset-password",
  authenticate,
  requireAdmin,
  resetUserPasswordByAdmin
);
router.get(
  "/:id/credits/history",
  authenticate,
  requireAdmin,
  getUserCreditHistory
);
router.get(
  "/:id/utilisation/history",
  authenticate,
  requireAdmin,
  getUserUtilisationHistory
);
router.get(
  "/:id/plan/history",
  authenticate,
  requireAdmin,
  getUserPlanHistory
);
router.get(
  "/:id/plan",
  authenticate,
  requireAdmin,
  getUserPlanDetails
);
router.post("/admin/create", authenticate, requireAdmin, createUserByAdmin);
router.get("/", authenticate, requireAdmin, listUsers);

module.exports = router;
