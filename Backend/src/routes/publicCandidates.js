const express = require("express");
const {
  publicAnnotateSearchPrompt,
  publicSearchCandidates,
  publicCheckHeroPrompt,
} = require("../controllers/publicCandidateController");
const {
  publicSearchRateLimit,
  publicPromptCheckRateLimit,
} = require("../middleware/publicSearchRateLimit");

const router = express.Router();

/** Gemini prompt dimension check (landing hero — after FE rule-based check). */
router.post("/check-prompt", publicPromptCheckRateLimit, publicCheckHeroPrompt);

/** Step 1 — prefill filters from prompt (dashboard annotate equivalent). */
router.post("/annotate", publicSearchRateLimit, publicAnnotateSearchPrompt);

/** Step 2 — apply filters + fetch preview candidates (dashboard apply equivalent). */
router.post("/search", publicSearchRateLimit, publicSearchCandidates);

module.exports = router;
