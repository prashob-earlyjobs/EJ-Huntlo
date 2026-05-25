const express = require("express");
const { authenticate, requireAdmin } = require("../middleware/auth");
const {
  searchCandidates,
  annotateSearchPrompt,
  createSearchSession,
  applySearchFilters,
  loadSessionProfiles,
  fetchMoreSessionProfiles,
  getSessionCandidateDetails,
  loadStoredSessionCandidates,
  listAllSourcedCandidates,
  listAllSourcedCandidatesAdmin,
  listSourcingSessionsAdmin,
  listSourcingSessions,
  listRecentSearches,
  revealCandidateContact,
  lookupRevealedContactsHandler,
  bulkRevealContactsHandler,
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
router.post("/search/annotate", authenticate, annotateSearchPrompt);
router.post("/search/create", authenticate, createSearchSession);
router.post("/search/apply", authenticate, applySearchFilters);
router.get("/all", authenticate, listAllSourcedCandidates);
router.get("/admin/all", authenticate, requireAdmin, listAllSourcedCandidatesAdmin);
router.get("/admin/sessions", authenticate, requireAdmin, listSourcingSessionsAdmin);
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
router.post("/revealed-contacts/lookup", authenticate, lookupRevealedContactsHandler);
router.post("/reveal-contacts/bulk", authenticate, bulkRevealContactsHandler);
router.get(
  "/candidate/:candidateId/details",
  authenticate,
  getSessionCandidateDetails
);
router.get(
  "/session/:sessionId/profiles",
  authenticate,
  loadSessionProfiles
);
router.post(
  "/session/:sessionId/fetch-more",
  authenticate,
  fetchMoreSessionProfiles
);
router.get(
  "/session/:sessionId/stored-candidates",
  authenticate,
  loadStoredSessionCandidates
);

module.exports = router;
