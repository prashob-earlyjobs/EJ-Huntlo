const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  listPlansHandler,
  getPlanHandler,
  createPlanHandler,
  updatePlanHandler,
  deletePlanHandler,
  sendEmailHandler,
} = require("../controllers/outreachController");
const {
  listTemplatesHandler,
  getTemplateHandler,
  createTemplateHandler,
} = require("../controllers/outreachTemplateController");
const { generateSequenceFromJdHandler } = require("../controllers/outreachAiController");

const router = express.Router();

router.post("/ai/generate-sequence", authenticate, generateSequenceFromJdHandler);
router.get("/templates", authenticate, listTemplatesHandler);
router.post("/templates", authenticate, createTemplateHandler);
router.get("/templates/:id", authenticate, getTemplateHandler);
router.get("/plans", authenticate, listPlansHandler);
router.post("/plans", authenticate, createPlanHandler);
router.get("/plans/:id", authenticate, getPlanHandler);
router.put("/plans/:id", authenticate, updatePlanHandler);
router.delete("/plans/:id", authenticate, deletePlanHandler);
router.post("/send", authenticate, sendEmailHandler);

module.exports = router;
