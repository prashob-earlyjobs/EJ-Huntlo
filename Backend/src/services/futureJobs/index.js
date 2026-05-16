const {
  createSourcingSession,
  updateSourcingSession,
  getSourcingSessionProfiles,
  getSourcingSessionProfilesWhenReady,
  fetchMoreSourcingSession,
  revealSourcingSessionContact,
  scoutPeopleLookup,
  scoutPeopleRevealContact,
} = require("./client");
const { buildSourcingSessionPayloadFromPrompt } = require("./payload");
const {
  DEFAULT_FILTER_FORM,
  filterFormFromCreateResponse,
  mergeFilterFormIntoSession,
  buildSessionPayloadForApply,
  buildSessionPayloadFromPromptAndFilter,
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
  buildSourcingSessionPayloadFromPrompt,
  DEFAULT_FILTER_FORM,
  filterFormFromCreateResponse,
  mergeFilterFormIntoSession,
  buildSessionPayloadForApply,
  buildSessionPayloadFromPromptAndFilter,
  getFutureJobsConfig,
  mapFjDocToCandidate,
};
