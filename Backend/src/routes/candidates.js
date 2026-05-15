const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  searchCandidates,
  loadSessionProfiles,
  loadStoredSessionCandidates,
  listAllSourcedCandidates,
  listSourcingSessions,
  listRecentSearches,
  revealCandidateContact,
  listSaveLists,
  createSaveList,
  deleteSaveList,
  listSavedCandidates,
  saveCandidate,
  unsaveCandidate,
} = require("../controllers/candidateController");
const {
  lookupPeopleScout,
  listRecentPeopleScout,
  revealPeopleScoutContact,
} = require("../controllers/peopleScoutController");

const router = express.Router();

router.post("/search", authenticate, searchCandidates);
router.get("/all", authenticate, listAllSourcedCandidates);
router.get("/sessions", authenticate, listSourcingSessions);
router.get("/recent-searches", authenticate, listRecentSearches);
router.get("/save-lists", authenticate, listSaveLists);
router.post("/save-lists", authenticate, createSaveList);
router.delete("/save-lists/:listId", authenticate, deleteSaveList);
router.get("/saved", authenticate, listSavedCandidates);
router.post("/saved", authenticate, saveCandidate);
router.delete("/saved", authenticate, unsaveCandidate);
router.post("/scout-people/reveal-contact", authenticate, revealPeopleScoutContact);
router.post("/scout-people/lookup", authenticate, lookupPeopleScout);
router.get("/scout-people/recent", authenticate, listRecentPeopleScout);
router.post("/reveal-contact", authenticate, revealCandidateContact);
router.get(
  "/session/:sessionId/profiles",
  authenticate,
  loadSessionProfiles
);
router.get(
  "/session/:sessionId/stored-candidates",
  authenticate,
  loadStoredSessionCandidates
);

module.exports = router;
