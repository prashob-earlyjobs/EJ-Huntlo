/** Plans that include Campaigns, Integrations, and standalone Outreaches. */
const CAMPAIGNS_INTEGRATIONS_PLAN_IDS = new Set(["growth", "enterprise"]);

export function hasCampaignsAndIntegrationsAccess(planId: string): boolean {
  return CAMPAIGNS_INTEGRATIONS_PLAN_IDS.has(String(planId || "").trim());
}

/** Growth & Enterprise: outreach thread quotas and utilisation meters on Plans & pricing. */
export function hasOutreachThreadUtilisation(planId: string): boolean {
  return hasCampaignsAndIntegrationsAccess(planId);
}

export const CAMPAIGNS_LOCKED_MESSAGE =
  "Campaigns are available on Growth and Enterprise plans. Upgrade to organize and run outreach campaigns.";

export const INTEGRATIONS_LOCKED_MESSAGE =
  "Integrations are available on Growth and Enterprise plans. Upgrade to connect Gmail, WhatsApp, Calendly, and LinkedIn.";

export const OUTREACHES_LOCKED_MESSAGE =
  "Outreaches are available on Growth and Enterprise plans. Upgrade to create outreach plans and send from Gmail or WhatsApp.";
