const mongoose = require("mongoose");
const CampaignCalendlyBooking = require("../models/CampaignCalendlyBooking");
const OutreachModuleCampaign = require("../models/OutreachModuleCampaign");
const {
  fetchCalendlyUser,
  fetchCalendlyScheduledEvents,
  fetchCalendlyEventInvitees,
  calendlyApiGet,
} = require("./calendlyClient");
const { getCalendlyCredentialsForUser } = require("./integrationService");
const { userIdFilterForActor } = require("../utils/orgScope");

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  throw err;
}

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  throw err;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function formatLocation(location) {
  if (!location || typeof location !== "object") return "";
  if (typeof location.join_url === "string" && location.join_url.trim()) {
    return location.join_url.trim();
  }
  if (typeof location.location === "string" && location.location.trim()) {
    return location.location.trim();
  }
  return "";
}

function buildSchedulingUrl(baseUrl, { name, email, campaignId } = {}) {
  const raw = String(baseUrl || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const n = String(name || "").trim();
    const e = normalizeEmail(email);
    if (n) url.searchParams.set("name", n);
    if (e) url.searchParams.set("email", e);
    if (campaignId) url.searchParams.set("utm_campaign", String(campaignId));
    return url.toString();
  } catch {
    return raw;
  }
}

function formatBookingRow(doc, candidateName = "") {
  return {
    id: String(doc._id),
    candidateId: doc.candidateId || "",
    candidateRefId: doc.candidateRefId || "",
    candidateName: doc.inviteeName || candidateName || "",
    inviteeEmail: doc.inviteeEmail || "",
    inviteeName: doc.inviteeName || "",
    eventName: doc.eventName || "",
    hostName: doc.hostName || "",
    startTime: doc.startTime ? new Date(doc.startTime).toISOString() : null,
    endTime: doc.endTime ? new Date(doc.endTime).toISOString() : null,
    status: doc.status || "active",
    rescheduleUrl: doc.rescheduleUrl || "",
    cancelUrl: doc.cancelUrl || "",
    timezone: doc.timezone || "",
    locationLabel: doc.locationLabel || "",
  };
}

async function findCampaignInScope(actorUserId, campaignId) {
  if (!mongoose.Types.ObjectId.isValid(campaignId)) throw badRequest("Invalid campaign id");
  const access = (await userIdFilterForActor(actorUserId)) || {
    userId: new mongoose.Types.ObjectId(String(actorUserId)),
  };
  const doc = await OutreachModuleCampaign.findOne({
    _id: campaignId,
    ...access,
  });
  if (!doc) throw notFound("Campaign not found");
  return doc;
}

function candidateMaps(doc) {
  const candidates = Array.isArray(doc.candidates) ? doc.candidates : [];
  const byEmail = new Map();
  const byId = new Map();
  for (const candidate of candidates) {
    const id = String(candidate._id);
    byId.set(id, candidate);
    const email = normalizeEmail(candidate.email);
    if (email) byEmail.set(email, candidate);
  }
  return { byEmail, byId, candidates };
}

function matchCandidateForInvitee(maps, inviteeEmail, resolvedEmailByRef) {
  const email = normalizeEmail(inviteeEmail);
  if (!email) return null;
  const direct = maps.byEmail.get(email);
  if (direct) return direct;
  for (const candidate of maps.candidates) {
    const refEmail = normalizeEmail(resolvedEmailByRef.get(String(candidate.candidateRefId)) || "");
    if (refEmail && refEmail === email) return candidate;
  }
  return null;
}

function findCandidateBookingInteraction(candidate, booking) {
  const interactions = Array.isArray(candidate?.interactions) ? candidate.interactions : [];
  const bookingId = String(booking?._id || "").trim();
  const inviteeUri = String(booking?.calendlyInviteeUri || "").trim();

  return interactions.find((row) => {
    const content = row?.content && typeof row.content === "object" ? row.content : {};
    if (String(content.action || "") !== "interview_booked") return false;
    if (bookingId && String(content.bookingId || "") === bookingId) return true;
    if (inviteeUri && String(content.calendlyInviteeUri || "") === inviteeUri) return true;
    return false;
  });
}

async function applyBookingToCandidate(candidate, booking, eventName) {
  if (!candidate || booking.status !== "active") return;

  const bookingId = String(booking._id);
  const inviteeUri = String(booking.calendlyInviteeUri || "").trim();
  const content = {
    action: "interview_booked",
    bookingId,
    calendlyInviteeUri: inviteeUri,
    startTime: booking.startTime,
    rescheduleUrl: booking.rescheduleUrl,
  };
  const summary = `Interview booked: ${eventName || "Calendly"}`;

  candidate.responseStatus = "interview_scheduled";
  candidate.nextAction = "Interview scheduled";

  const existing = findCandidateBookingInteraction(candidate, booking);
  if (existing) {
    existing.summary = summary;
    existing.content = content;
    return;
  }

  candidate.interactions.push({
    type: "action",
    summary,
    content,
    at: new Date(),
  });
}

async function upsertBookingFromInvitee({
  userId,
  campaignId,
  event,
  invitee,
  maps,
  resolvedEmailByRef,
}) {
  const inviteeUri = String(invitee?.uri || "").trim();
  const eventUri = String(event?.uri || "").trim();
  if (!inviteeUri || !eventUri) return null;

  const inviteeEmail = normalizeEmail(invitee.email);
  const matched = matchCandidateForInvitee(maps, inviteeEmail, resolvedEmailByRef);
  const eventStatus = String(event?.status || "active").toLowerCase() === "canceled" ? "canceled" : "active";
  const inviteeStatus = String(invitee?.status || "active").toLowerCase() === "canceled" ? "canceled" : eventStatus;

  const patch = {
    userId,
    outreachModuleCampaignId: campaignId,
    candidateId: matched ? String(matched._id) : "",
    candidateRefId: matched ? String(matched.candidateRefId || "") : "",
    calendlyEventUri: eventUri,
    calendlyInviteeUri: inviteeUri,
    eventTypeUri: String(event?.event_type || "").trim(),
    eventName: String(event?.name || "").trim(),
    inviteeEmail,
    inviteeName: String(invitee?.name || "").trim(),
    hostName: "",
    startTime: event?.start_time ? new Date(event.start_time) : new Date(),
    endTime: event?.end_time ? new Date(event.end_time) : null,
    status: inviteeStatus,
    rescheduleUrl: String(invitee?.reschedule_url || "").trim(),
    cancelUrl: String(invitee?.cancel_url || "").trim(),
    timezone: String(invitee?.timezone || "").trim(),
    locationLabel: formatLocation(event?.location),
  };

  const booking = await CampaignCalendlyBooking.findOneAndUpdate(
    { calendlyInviteeUri: inviteeUri },
    { $set: patch },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  if (matched && inviteeStatus === "active") {
    await applyBookingToCandidate(matched, booking, patch.eventName);
  }

  return booking;
}

async function loadResolvedEmails(doc, actorUserId) {
  const { resolveContactsForOutreachModuleCampaign } = require("./outreachModuleContactResolver");
  const plain = doc.toObject ? doc.toObject() : doc;
  const resolved = await resolveContactsForOutreachModuleCampaign(plain, actorUserId);
  const map = new Map();
  for (const row of resolved) {
    map.set(String(row.candidateRefId), normalizeEmail(row.email));
  }
  return map;
}

async function syncCampaignCalendlyBookings(actorUserId, campaignId) {
  const doc = await findCampaignInScope(actorUserId, campaignId);
  const calendly = doc.calendlyAutomation || {};
  if (!calendly.enabled || !calendly.meetingUri) {
    return { synced: 0, message: "Calendly is not enabled on this campaign." };
  }

  const creds = await getCalendlyCredentialsForUser(actorUserId);
  const user = await fetchCalendlyUser(creds.personalAccessToken);
  const events = await fetchCalendlyScheduledEvents(creds.personalAccessToken, {
    userUri: user.uri,
    eventTypeUri: calendly.meetingUri,
  });

  const maps = candidateMaps(doc);
  const resolvedEmailByRef = await loadResolvedEmails(doc, actorUserId);
  let synced = 0;

  for (const event of events) {
    const invitees = await fetchCalendlyEventInvitees(creds.personalAccessToken, event.uri);
    for (const invitee of invitees) {
      const booking = await upsertBookingFromInvitee({
        userId: doc.userId,
        campaignId: doc._id,
        event,
        invitee,
        maps,
        resolvedEmailByRef,
      });
      if (booking) synced += 1;
    }
  }

  await doc.save();
  return { synced, message: `Synced ${synced} Calendly booking(s).` };
}

async function listCampaignScheduledInterviews(actorUserId, campaignId, options = {}) {
  const doc = await findCampaignInScope(actorUserId, campaignId);
  if (options.sync !== false) {
    try {
      await syncCampaignCalendlyBookings(actorUserId, campaignId);
    } catch (err) {
      if (!options.allowSyncFailure) throw err;
    }
  }

  const bookings = await CampaignCalendlyBooking.find({
    outreachModuleCampaignId: doc._id,
    status: options.includeCanceled ? { $in: ["active", "canceled"] } : "active",
  })
    .sort({ startTime: -1 })
    .lean();

  const maps = candidateMaps(doc);
  const interviews = bookings.map((row) => {
    const candidate = row.candidateId ? maps.byId.get(String(row.candidateId)) : null;
    return formatBookingRow(row, candidate?.name || "");
  });

  const calendly = doc.calendlyAutomation || {};
  return {
    interviews,
    calendly: {
      enabled: Boolean(calendly.enabled),
      meetingName: calendly.meetingName || "",
      schedulingUrl: calendly.schedulingUrl || "",
    },
  };
}

async function getCandidateScheduledInterview(actorUserId, campaignId, candidateId) {
  await findCampaignInScope(actorUserId, campaignId);
  const upcoming = await CampaignCalendlyBooking.findOne({
    outreachModuleCampaignId: campaignId,
    candidateId: String(candidateId),
    status: "active",
    startTime: { $gte: new Date() },
  })
    .sort({ startTime: 1 })
    .lean();
  if (upcoming) return formatBookingRow(upcoming);

  const latest = await CampaignCalendlyBooking.findOne({
    outreachModuleCampaignId: campaignId,
    candidateId: String(candidateId),
    status: "active",
  })
    .sort({ startTime: -1 })
    .lean();
  return latest ? formatBookingRow(latest) : null;
}

async function sendCandidateSchedulingLink(actorUserId, campaignId, candidateId, options = {}) {
  const doc = await findCampaignInScope(actorUserId, campaignId);
  const calendly = doc.calendlyAutomation || {};
  if (!calendly.enabled || !calendly.schedulingUrl) {
    throw badRequest("Enable a Calendly meeting on this campaign before sending a scheduling link.");
  }

  const candidate = doc.candidates.id(candidateId);
  if (!candidate) throw notFound("Candidate not found in campaign");

  const resolvedEmails = await loadResolvedEmails(doc, actorUserId);
  const email = normalizeEmail(candidate.email) || resolvedEmails.get(String(candidate.candidateRefId)) || "";
  const schedulingUrl = buildSchedulingUrl(calendly.schedulingUrl, {
    name: candidate.name,
    email,
    campaignId: String(doc._id),
  });

  const { deliverCalendlyLink, channelsForCampaignCandidate } = require("./scheduleLinkDeliveryService");
  const delivery = await deliverCalendlyLink({
    userId: actorUserId,
    candidateName: candidate.name,
    email,
    phone: candidate.phone,
    schedulingUrl,
    meetingName: calendly.meetingName || "",
    role: candidate.role || "",
    channels: channelsForCampaignCandidate(doc, candidate, options.channels),
    emailIntegrationId: doc.emailIntegrationId ? String(doc.emailIntegrationId) : "",
  });

  candidate.responseStatus = "follow_up_scheduled";
  candidate.nextAction = "Awaiting Calendly booking";
  candidate.interactions.push({
    type: "action",
    summary: "Calendly scheduling link sent",
    content: {
      action: "scheduling_link_sent",
      schedulingUrl,
      emailSent: delivery.emailSent,
      whatsappSent: delivery.whatsappSent,
    },
    at: new Date(),
  });
  await doc.save();

  return {
    schedulingUrl,
    candidateId: String(candidate._id),
    emailSent: delivery.emailSent,
    whatsappSent: delivery.whatsappSent,
    deliveryErrors: delivery.errors,
  };
}

async function findCampaignsForEventType(eventTypeUri) {
  const key = String(eventTypeUri || "").trim();
  if (!key) return [];
  return OutreachModuleCampaign.find({
    "calendlyAutomation.enabled": true,
    "calendlyAutomation.meetingUri": key,
  });
}

async function processCalendlyWebhookEvent(payload = {}) {
  const eventUri = String(payload?.scheduled_event?.uri || payload?.event || "").trim();
  const inviteeUri = String(payload?.invitee?.uri || payload?.invitee || "").trim();
  if (!eventUri) return { handled: false, reason: "missing_event" };

  let eventResource = payload?.scheduled_event;
  let inviteeResource = payload?.invitee;

  const eventTypeUri = String(eventResource?.event_type || "").trim();
  const campaigns = await findCampaignsForEventType(eventTypeUri);

  let synced = 0;
  for (const campaign of campaigns) {
    const actorUserId = campaign.userId;
    let creds;
    try {
      creds = await getCalendlyCredentialsForUser(actorUserId);
    } catch {
      continue;
    }

    if (!eventResource?.uri) {
      const data = await calendlyApiGet(creds.personalAccessToken, eventUri);
      eventResource = data?.resource || data;
    }

    let invitees = [];
    if (inviteeResource?.uri) {
      invitees = [inviteeResource];
    } else {
      invitees = await fetchCalendlyEventInvitees(creds.personalAccessToken, eventUri);
    }

    const maps = candidateMaps(campaign);
    const resolvedEmailByRef = await loadResolvedEmails(campaign, actorUserId);
    for (const invitee of invitees) {
      let inviteeRow = invitee;
      if (invitee?.uri && !invitee?.email) {
        const data = await calendlyApiGet(creds.personalAccessToken, invitee.uri);
        inviteeRow = data?.resource || data;
      }
      await upsertBookingFromInvitee({
        userId: campaign.userId,
        campaignId: campaign._id,
        event: eventResource,
        invitee: inviteeRow,
        maps,
        resolvedEmailByRef,
      });
      synced += 1;
    }
    await campaign.save();
  }

  if (campaigns.length === 0 && eventTypeUri) {
    const { matchScheduleCandidatesForWebhook, upsertDirectBooking } = require("./scheduleService");
    const inviteeEmail = normalizeEmail(inviteeResource?.email || payload?.email);
    const directCandidates = await matchScheduleCandidatesForWebhook(eventTypeUri, inviteeEmail);
    for (const candidate of directCandidates) {
      let creds;
      try {
        creds = await getCalendlyCredentialsForUser(candidate.userId);
      } catch {
        continue;
      }
      if (!eventResource?.uri) {
        const data = await calendlyApiGet(creds.personalAccessToken, eventUri);
        eventResource = data?.resource || data;
      }
      let inviteeRow = inviteeResource;
      if (inviteeResource?.uri && !inviteeResource?.email) {
        const data = await calendlyApiGet(creds.personalAccessToken, inviteeResource.uri);
        inviteeRow = data?.resource || data;
      }
      if (!inviteeRow?.email) continue;
      await upsertDirectBooking({
        userId: candidate.userId,
        scheduleCandidate: candidate,
        event: eventResource,
        invitee: inviteeRow,
      });
      synced += 1;
    }
  }

  if (synced === 0 && campaigns.length === 0) {
    return { handled: false, reason: "no_matching_campaign_or_candidate" };
  }

  return { handled: true, synced };
}

module.exports = {
  syncCampaignCalendlyBookings,
  listCampaignScheduledInterviews,
  getCandidateScheduledInterview,
  sendCandidateSchedulingLink,
  processCalendlyWebhookEvent,
  buildSchedulingUrl,
};
