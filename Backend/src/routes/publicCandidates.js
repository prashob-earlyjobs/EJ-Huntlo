const express = require("express");
const {
  publicAnnotateSearchPrompt,
  publicSearchCandidates,
} = require("../controllers/publicCandidateController");
const { publicSearchRateLimit } = require("../middleware/publicSearchRateLimit");

const router = express.Router();

/** Step 1 — prefill filters from prompt (dashboard annotate equivalent). */
router.post("/annotate", publicSearchRateLimit, publicAnnotateSearchPrompt);

/** Step 2 — apply filters + fetch preview candidates (dashboard apply equivalent). */
router.post("/search", publicSearchRateLimit, publicSearchCandidates);

module.exports = router;
