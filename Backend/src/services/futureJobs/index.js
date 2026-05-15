const {
  createSourcingSession,
  getSourcingSessionProfiles,
  fetchMoreSourcingSession,
  revealSourcingSessionContact,
  scoutPeopleLookup,
  scoutPeopleRevealContact,
} = require("./client");
const { buildSourcingSessionPayloadFromPrompt } = require("./payload");
const { getFutureJobsConfig } = require("./config");
const { mapFjDocToCandidate } = require("./mapProfile");

module.exports = {
  createSourcingSession,
  getSourcingSessionProfiles,
  fetchMoreSourcingSession,
  revealSourcingSessionContact,
  scoutPeopleLookup,
  scoutPeopleRevealContact,
  buildSourcingSessionPayloadFromPrompt,
  getFutureJobsConfig,
  mapFjDocToCandidate,
};
