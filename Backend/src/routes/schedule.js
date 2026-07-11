const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  getScheduleOverviewHandler,
  syncScheduleHandler,
  listScheduleCandidatesHandler,
  createScheduleCandidateHandler,
  sendScheduleCandidateLinkHandler,
  listScheduleMeetingsHandler,
  getScheduleReminderSettingsHandler,
  updateScheduleReminderSettingsHandler,
} = require("../controllers/scheduleController");

const router = express.Router();

router.get("/overview", authenticate, getScheduleOverviewHandler);
router.post("/sync", authenticate, syncScheduleHandler);
router.get("/meetings", authenticate, listScheduleMeetingsHandler);
router.get("/candidates", authenticate, listScheduleCandidatesHandler);
router.post("/candidates", authenticate, createScheduleCandidateHandler);
router.post("/candidates/:id/send-link", authenticate, sendScheduleCandidateLinkHandler);
router.get("/reminder-settings", authenticate, getScheduleReminderSettingsHandler);
router.put("/reminder-settings", authenticate, updateScheduleReminderSettingsHandler);

module.exports = router;
