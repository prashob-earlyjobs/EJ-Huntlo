const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  getStatsHandler,
  listScreeningsHandler,
  getScreeningHandler,
  getCandidateHandler,
  getResultVariablesHandler,
  getDraftHandler,
  createScreeningHandler,
  updateScreeningHandler,
  launchScreeningHandler,
  pauseScreeningHandler,
  recordCandidateActionHandler,
  generateQuestionsHandler,
} = require("../controllers/screeningController");

const router = express.Router();

router.get("/stats", authenticate, getStatsHandler);
router.post("/generate-questions", authenticate, generateQuestionsHandler);
router.get("/", authenticate, listScreeningsHandler);
router.post("/", authenticate, createScreeningHandler);
router.get("/:id", authenticate, getScreeningHandler);
router.put("/:id", authenticate, updateScreeningHandler);
router.get("/:id/draft", authenticate, getDraftHandler);
router.get("/:id/variables", authenticate, getResultVariablesHandler);
router.post("/:id/launch", authenticate, launchScreeningHandler);
router.post("/:id/pause", authenticate, pauseScreeningHandler);
router.get("/:id/candidates/:candidateId", authenticate, getCandidateHandler);
router.post(
  "/:id/candidates/:candidateId/actions",
  authenticate,
  recordCandidateActionHandler
);

module.exports = router;
