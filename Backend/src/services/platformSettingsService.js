const PlatformSettings = require("../models/PlatformSettings");
const {
  DEFAULT_MESSAGING_CHANNEL,
  isValidMessagingChannel,
} = require("../constants/platformMessagingChannel");

const SINGLETON_KEY = "singleton";

function toSettingsPayload(doc) {
  if (!doc) {
    return {
      messagingChannel: DEFAULT_MESSAGING_CHANNEL,
      updatedAt: null,
    };
  }
  return {
    messagingChannel: doc.messagingChannel || DEFAULT_MESSAGING_CHANNEL,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}

async function getPlatformSettings() {
  const doc = await PlatformSettings.findOneAndUpdate(
    { key: SINGLETON_KEY },
    {
      $setOnInsert: {
        key: SINGLETON_KEY,
        messagingChannel: DEFAULT_MESSAGING_CHANNEL,
      },
    },
    { upsert: true, new: true }
  );
  return toSettingsPayload(doc);
}

async function setMessagingChannel(messagingChannel) {
  if (!isValidMessagingChannel(messagingChannel)) {
    const err = new Error(
      `messagingChannel must be one of: huntlo_meta, gupshup`
    );
    err.statusCode = 400;
    throw err;
  }

  const doc = await PlatformSettings.findOneAndUpdate(
    { key: SINGLETON_KEY },
    {
      $set: { messagingChannel },
      $setOnInsert: { key: SINGLETON_KEY },
    },
    { upsert: true, new: true }
  );
  return toSettingsPayload(doc);
}

/** Active WhatsApp provider for the whole platform (admin Settings). */
async function getActiveMessagingChannel() {
  const settings = await getPlatformSettings();
  return settings.messagingChannel;
}

module.exports = {
  getPlatformSettings,
  setMessagingChannel,
  getActiveMessagingChannel,
};
