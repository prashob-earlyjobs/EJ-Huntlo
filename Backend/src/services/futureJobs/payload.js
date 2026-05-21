const { promptForSourcingApi } = require("./filterMapping");

/**
 * Build sourcing-session JSON from a free-text prompt.
 * Only prompt text is sent; queries stay empty so Future Jobs parses from jdDetail.userText.
 */
const buildSourcingSessionPayloadFromPrompt = (prompt) => {
  const userText = promptForSourcingApi(prompt);
  const sessionTitle = userText
    ? userText.split(/\r?\n/)[0].slice(0, 120).trim()
    : "";

  return {
    sessionTitle,
    jdDetail: {
      userText,
    },
    queries: {},
  };
};

module.exports = { buildSourcingSessionPayloadFromPrompt };
