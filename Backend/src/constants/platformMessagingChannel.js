const MESSAGING_CHANNELS = Object.freeze(["huntlo_meta", "gupshup"]);
const DEFAULT_MESSAGING_CHANNEL = "huntlo_meta";

function isValidMessagingChannel(value) {
  return typeof value === "string" && MESSAGING_CHANNELS.includes(value);
}

module.exports = {
  MESSAGING_CHANNELS,
  DEFAULT_MESSAGING_CHANNEL,
  isValidMessagingChannel,
};
