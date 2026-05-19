const {
  createSourcingSession,
  updateSourcingSession,
  getSourcingSessionProfiles,
  getSourcingSessionProfilesWhenReady,
  fetchMoreSourcingSession,
  revealSourcingSessionContact,
  scoutPeopleLookup,
  scoutPeopleRevealContact,
  getSourcingSessionAnnotation,
} = require("./client");
const { buildSourcingSessionPayloadFromPrompt } = require("./payload");
const {
  DEFAULT_FILTER_FORM,
  filterFormFromCreateResponse,
  mergeFilterFormIntoSession,
  buildSessionPayloadForApply,
  buildSessionPayloadFromPromptAndFilter,
  filterFormFromAnnotation,
} = require("./filterMapping");
const { getFutureJobsConfig } = require("./config");
const { mapFjDocToCandidate } = require("./mapProfile");

module.exports = {
  createSourcingSession,
  updateSourcingSession,
  getSourcingSessionProfiles,
  getSourcingSessionProfilesWhenReady,
  fetchMoreSourcingSession,
  revealSourcingSessionContact,
  scoutPeopleLookup,
  scoutPeopleRevealContact,
  getSourcingSessionAnnotation,
  buildSourcingSessionPayloadFromPrompt,
  DEFAULT_FILTER_FORM,
  filterFormFromCreateResponse,
  mergeFilterFormIntoSession,
  buildSessionPayloadForApply,
  buildSessionPayloadFromPromptAndFilter,
  filterFormFromAnnotation,
  getFutureJobsConfig,
  mapFjDocToCandidate,
};
