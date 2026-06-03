/** Maximum contacts per campaign (enforced on create and add). */
const CAMPAIGN_MAX_CONTACTS = 200;

const CAMPAIGN_CONTACT_LIMIT_MESSAGE = `Maximum ${CAMPAIGN_MAX_CONTACTS} contacts per campaign.`;

module.exports = {
  CAMPAIGN_MAX_CONTACTS,
  CAMPAIGN_CONTACT_LIMIT_MESSAGE,
};
