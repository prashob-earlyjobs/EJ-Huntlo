const mongoose = require("mongoose");
const ScheduleCandidate = require("../models/ScheduleCandidate");
const CampaignCalendlyBooking = require("../models/CampaignCalendlyBooking");
const OutreachModuleCampaign = require("../models/OutreachModuleCampaign");
const {
  fetchCalendlyUser,
  fetchCalendlyScheduledEvents,
  fetchCalendlyEventInvitees,
} = require("./calendlyClient");
const { getCalendlyCredentialsForUser, listCalendlyEventTypesForUser } = require("./integrationService");
const {
  buildSchedulingUrl,
  syncCampaignCalendlyBookings,
} = require("./campaignCalendlyBookingService");

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

function formatInterviewRow(doc, extra = {}) {
  return {
    id: String(doc._id),
    candidateId: doc.scheduleCandidateId ? String(doc.scheduleCandidateId) : doc.candidateId || "",
    scheduleCandidateId: doc.scheduleCandidateId ? String(doc.scheduleCandidateId) : "",
    campaignId: doc.outreachModuleCampaignId ? String(doc.outreachModuleCampaignId) : "",
    source: doc.scheduleCandidateId
      ? "direct"
      : doc.outreachModuleCampaignId
        ? "campaign"
        : "calendly",
    candidateName: doc.inviteeName || extra.candidateName || "",
    inviteeEmail: doc.inviteeEmail || "",
    inviteeName: doc.inviteeName || "",
    eventName: doc.eventName || "",
    hostName: doc.hostName || "",
    startTime: doc.startTime ? new Date(doc.startTime).toISOString() : null,
    endTime: doc.endTime ? new Date(doc.endTime).toISOString() : null,
    status: doc.status === "active" ? "confirmed" : "cancelled",
    rescheduleUrl: doc.rescheduleUrl || "",
    cancelUrl: doc.cancelUrl || "",
    timezone: doc.timezone || "",
    locationLabel: doc.locationLabel || "",
    campaignName: extra.campaignName || "",
    role: extra.role || "",
  };
}

function formatScheduleCandidate(doc) {
  return {
    id: String(doc._id),
    name: doc.name || "",
    email: doc.email || "",
    phone: doc.phone || "",
    role: doc.role || "",
    company: doc.company || "",
    location: doc.location || "",
    status: doc.status || "pending",
    meetingUri: doc.meetingUri || "",
    meetingName: doc.meetingName || "",
    schedulingUrl: doc.schedulingUrl || "",
    source: doc.source || "manual",
    notes: doc.notes || "",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
}

async function upsertDirectBooking({ userId, scheduleCandidate, event, invitee }) {
  const inviteeUri = String(invitee?.uri || "").trim();
  const eventUri = String(event?.uri || "").trim();
  if (!inviteeUri || !eventUri) return null;

  const inviteeEmail = normalizeEmail(invitee.email);
  const eventStatus = String(event?.status || "active").toLowerCase() === "canceled" ? "canceled" : "active";
  const inviteeStatus = String(invitee?.status || "active").toLowerCase() === "canceled" ? "canceled" : eventStatus;

  const patch = {
    userId,
    scheduleCandidateId: scheduleCandidate._id,
    outreachModuleCampaignId: null,
    candidateId: "",
    candidateRefId: "",
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

  if (inviteeStatus === "active") {
    scheduleCandidate.status = "scheduled";
  } else if (inviteeStatus === "canceled") {
    scheduleCandidate.status = "canceled";
  }
  await scheduleCandidate.save();

  return booking;
}

function bookingSourceFromDoc(doc) {
  if (doc.scheduleCandidateId) return "direct";
  if (doc.outreachModuleCampaignId) return "campaign";
  return "calendly";
}

async function buildScheduleLinkContext(actorUserId) {
  const userOid = new mongoose.Types.ObjectId(actorUserId);
  const [scheduleCandidates, campaigns] = await Promise.all([
    ScheduleCandidate.find({ userId: userOid }).lean(),
    OutreachModuleCampaign.find({
      userId: actorUserId,
    })
      .select("name candidates")
      .lean(),
  ]);

  const scheduleByEmail = new Map();
  for (const row of scheduleCandidates) {
    const email = normalizeEmail(row.email);
    if (email) scheduleByEmail.set(email, row);
  }

  const campaignByEmail = new Map();
  for (const campaign of campaigns) {
    for (const candidate of campaign.candidates || []) {
      const email = normalizeEmail(candidate.email);
      if (!email || campaignByEmail.has(email)) continue;
      campaignByEmail.set(email, {
        campaignId: campaign._id,
        campaignName: campaign.name || "",
        candidateId: String(candidate._id),
        candidateName: candidate.name || "",
        role: candidate.role || "",
      });
    }
  }

  return { scheduleByEmail, campaignByEmail };
}

async function upsertAccountCalendlyBooking({ userId, event, invitee, hostName, linkContext, existing }) {
  const inviteeUri = String(invitee?.uri || "").trim();
  const eventUri = String(event?.uri || "").trim();
  if (!inviteeUri || !eventUri) return null;

  const inviteeEmail = normalizeEmail(invitee.email);
  const eventStatus = String(event?.status || "active").toLowerCase() === "canceled" ? "canceled" : "active";
  const inviteeStatus = String(invitee?.status || "active").toLowerCase() === "canceled" ? "canceled" : eventStatus;

  let scheduleCandidateId = existing?.scheduleCandidateId || null;
  let outreachModuleCampaignId = existing?.outreachModuleCampaignId || null;
  let candidateId = existing?.candidateId || "";
  let candidateRefId = existing?.candidateRefId || "";

  if (!scheduleCandidateId && inviteeEmail) {
    const sc = linkContext.scheduleByEmail.get(inviteeEmail);
    if (sc) scheduleCandidateId = sc._id;
  }

  if (!outreachModuleCampaignId && inviteeEmail) {
    const match = linkContext.campaignByEmail.get(inviteeEmail);
    if (match) {
      outreachModuleCampaignId = match.campaignId;
      candidateId = match.candidateId;
    }
  }

  const patch = {
    userId,
    scheduleCandidateId: scheduleCandidateId || null,
    outreachModuleCampaignId: outreachModuleCampaignId || null,
    candidateId,
    candidateRefId,
    calendlyEventUri: eventUri,
    calendlyInviteeUri: inviteeUri,
    eventTypeUri: String(event?.event_type || "").trim(),
    eventName: String(event?.name || "").trim(),
    inviteeEmail,
    inviteeName: String(invitee?.name || "").trim(),
    hostName: String(hostName || "").trim(),
    startTime: event?.start_time ? new Date(event.start_time) : new Date(),
    endTime: event?.end_time ? new Date(event.end_time) : null,
    status: inviteeStatus,
    rescheduleUrl: String(invitee?.reschedule_url || "").trim(),
    cancelUrl: String(invitee?.cancel_url || "").trim(),
    timezone: String(invitee?.timezone || "").trim(),
    locationLabel: formatLocation(event?.location),
  };

  return CampaignCalendlyBooking.findOneAndUpdate(
    { calendlyInviteeUri: inviteeUri },
    { $set: patch },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}

/** Import all Calendly scheduled events for the connected account (not only Huntlo-linked meeting types). */
async function syncAccountCalendlyBookings(actorUserId) {
  const creds = await getCalendlyCredentialsForUser(actorUserId);
  const calendlyUser = await fetchCalendlyUser(creds.personalAccessToken);
  const userOid = new mongoose.Types.ObjectId(actorUserId);
  const linkContext = await buildScheduleLinkContext(actorUserId);

  const events = await fetchCalendlyScheduledEvents(creds.personalAccessToken, {
    userUri: calendlyUser.uri,
    minStartTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  });

  const eventInvitees = [];
  for (const event of events) {
    const invitees = await fetchCalendlyEventInvitees(creds.personalAccessToken, event.uri);
    for (const invitee of invitees) {
      eventInvitees.push({ event, invitee });
    }
  }

  const inviteeUris = eventInvitees
    .map(({ invitee }) => String(invitee?.uri || "").trim())
    .filter(Boolean);

  const existingRows = inviteeUris.length
    ? await CampaignCalendlyBooking.find({
        userId: userOid,
        calendlyInviteeUri: { $in: inviteeUris },
      }).lean()
    : [];
  const existingByInvitee = new Map(existingRows.map((row) => [row.calendlyInviteeUri, row]));

  let synced = 0;
  for (const { event, invitee } of eventInvitees) {
    const inviteeUri = String(invitee?.uri || "").trim();
    const booking = await upsertAccountCalendlyBooking({
      userId: userOid,
      event,
      invitee,
      hostName: calendlyUser.name,
      linkContext,
      existing: inviteeUri ? existingByInvitee.get(inviteeUri) : null,
    });
    if (booking) synced += 1;
  }

  return { synced, message: `Synced ${synced} Calendly account booking(s).` };
}

async function syncDirectScheduleBookings(actorUserId) {
  const userOid = new mongoose.Types.ObjectId(actorUserId);
  const candidates = await ScheduleCandidate.find({
    userId: userOid,
    meetingUri: { $ne: "" },
    status: { $in: ["pending", "link_sent", "scheduled"] },
  });

  if (candidates.length === 0) {
    return { synced: 0, message: "No direct schedule candidates to sync." };
  }

  const creds = await getCalendlyCredentialsForUser(actorUserId);
  const user = await fetchCalendlyUser(creds.personalAccessToken);
  const byEmail = new Map();
  const meetingUris = new Set();

  for (const candidate of candidates) {
    const email = normalizeEmail(candidate.email);
    if (email) byEmail.set(email, candidate);
    if (candidate.meetingUri) meetingUris.add(candidate.meetingUri);
  }

  let synced = 0;
  for (const meetingUri of meetingUris) {
    const events = await fetchCalendlyScheduledEvents(creds.personalAccessToken, {
      userUri: user.uri,
      eventTypeUri: meetingUri,
    });

    for (const event of events) {
      const invitees = await fetchCalendlyEventInvitees(creds.personalAccessToken, event.uri);
      for (const invitee of invitees) {
        const email = normalizeEmail(invitee.email);
        const candidate = email ? byEmail.get(email) : null;
        if (!candidate) continue;
        const booking = await upsertDirectBooking({
          userId: userOid,
          scheduleCandidate: candidate,
          event,
          invitee,
        });
        if (booking) synced += 1;
      }
    }
  }

  return { synced, message: `Synced ${synced} direct Calendly booking(s).` };
}

async function syncAllScheduleBookings(actorUserId) {
  const campaigns = await OutreachModuleCampaign.find({
    userId: actorUserId,
    "calendlyAutomation.enabled": true,
    "calendlyAutomation.meetingUri": { $ne: "" },
  }).select("_id");

  let campaignSynced = 0;
  for (const campaign of campaigns) {
    try {
      const result = await syncCampaignCalendlyBookings(actorUserId, String(campaign._id));
      campaignSynced += result.synced || 0;
    } catch {
      // Skip campaigns that fail sync (e.g. disconnected Calendly mid-loop).
    }
  }

  const direct = await syncDirectScheduleBookings(actorUserId);
  let accountSynced = 0;
  try {
    const account = await syncAccountCalendlyBookings(actorUserId);
    accountSynced = account.synced || 0;
  } catch {
    // Calendly disconnected or API error — campaign/direct sync may still have succeeded.
  }

  const total = Math.max(campaignSynced + (direct.synced || 0), accountSynced);
  return {
    synced: total,
    campaignSynced,
    directSynced: direct.synced || 0,
    accountSynced,
    message: `Synced ${total} interview booking(s).`,
  };
}

async function getScheduleOverview(actorUserId, options = {}) {
  if (options.sync !== false) {
    try {
      await syncAllScheduleBookings(actorUserId);
    } catch {
      if (!options.allowSyncFailure) throw badRequest("Could not sync Calendly bookings. Connect Calendly under Integrations.");
    }
  }

  const userOid = new mongoose.Types.ObjectId(actorUserId);
  const now = new Date();
  const lookbackMs = 30 * 24 * 60 * 60 * 1000;
  const lookaheadMs = 90 * 24 * 60 * 60 * 1000;

  const bookings = await CampaignCalendlyBooking.find({
    userId: userOid,
    status: { $in: ["active", "canceled"] },
    startTime: {
      $gte: new Date(now.getTime() - lookbackMs),
      $lte: new Date(now.getTime() + lookaheadMs),
    },
  })
    .sort({ startTime: 1 })
    .limit(200)
    .lean();

  const scheduleCandidateIds = bookings
    .filter((b) => b.scheduleCandidateId)
    .map((b) => b.scheduleCandidateId);
  const campaignIds = bookings
    .filter((b) => b.outreachModuleCampaignId)
    .map((b) => b.outreachModuleCampaignId);

  const [scheduleCandidates, campaigns] = await Promise.all([
    scheduleCandidateIds.length
      ? ScheduleCandidate.find({ _id: { $in: scheduleCandidateIds } }).lean()
      : [],
    campaignIds.length
      ? OutreachModuleCampaign.find({ _id: { $in: campaignIds } }).select("name candidates").lean()
      : [],
  ]);

  const scheduleById = new Map(scheduleCandidates.map((c) => [String(c._id), c]));
  const campaignById = new Map(campaigns.map((c) => [String(c._id), c]));

  function mapBookingRow(row) {
    let linkedName = "";
    let role = "";
    let campaignName = "";

    if (row.scheduleCandidateId) {
      const sc = scheduleById.get(String(row.scheduleCandidateId));
      if (sc) {
        linkedName = sc.name || "";
        role = sc.role || "";
      }
    } else if (row.outreachModuleCampaignId && row.candidateId) {
      const campaign = campaignById.get(String(row.outreachModuleCampaignId));
      campaignName = campaign?.name || "";
      const candidate = (campaign?.candidates || []).find((c) => String(c._id) === String(row.candidateId));
      if (candidate) {
        linkedName = candidate.name || "";
        role = candidate.role || "";
      }
    }

    return formatInterviewRow(row, { candidateName: linkedName, role, campaignName });
  }

  const interviews = bookings.map(mapBookingRow);
  const upcoming = interviews
    .filter((row) => row.startTime && new Date(row.startTime) >= now && row.status === "confirmed")
    .slice(0, 20);

  const [totalScheduled, confirmed, pendingDirect, canceled] = await Promise.all([
    CampaignCalendlyBooking.countDocuments({ userId: userOid, status: "active", startTime: { $gte: now } }),
    CampaignCalendlyBooking.countDocuments({ userId: userOid, status: "active", startTime: { $gte: now } }),
    ScheduleCandidate.countDocuments({ userId: userOid, status: { $in: ["pending", "link_sent"] } }),
    CampaignCalendlyBooking.countDocuments({ userId: userOid, status: "canceled" }),
  ]);

  let calendlyConnected = false;
  try {
    await getCalendlyCredentialsForUser(actorUserId);
    calendlyConnected = true;
  } catch {
    calendlyConnected = false;
  }

  return {
    stats: {
      interviewsScheduled: totalScheduled,
      confirmed,
      pendingConfirmation: pendingDirect,
      rescheduleRequests: 0,
      noShows: 0,
      canceled,
    },
    upcoming,
    interviews,
    calendlyConnected,
  };
}

async function listScheduleCandidates(actorUserId, options = {}) {
  const userOid = new mongoose.Types.ObjectId(actorUserId);
  const filter = { userId: userOid };
  if (options.status) filter.status = options.status;

  const rows = await ScheduleCandidate.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
  return rows.map(formatScheduleCandidate);
}

async function createScheduleCandidate(actorUserId, body = {}) {
  const name = String(body.name || "").trim();
  const email = normalizeEmail(body.email);
  if (!name) throw badRequest("Candidate name is required.");
  if (!email) throw badRequest("Candidate email is required.");

  const meetingUri = String(body.meetingUri || "").trim();
  const meetingName = String(body.meetingName || "").trim();
  const schedulingUrl = String(body.schedulingUrl || "").trim();

  const doc = await ScheduleCandidate.create({
    userId: actorUserId,
    name,
    email,
    phone: String(body.phone || "").trim(),
    role: String(body.role || "").trim(),
    company: String(body.company || "").trim(),
    location: String(body.location || "").trim(),
    source: String(body.source || "manual").trim() || "manual",
    notes: String(body.notes || "").trim(),
    meetingUri,
    meetingName,
    schedulingUrl,
    status: "pending",
  });

  return formatScheduleCandidate(doc);
}

async function createScheduleCandidatesBatch(actorUserId, rows = [], options = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw badRequest("At least one candidate is required.");
  }

  const sendLinks = options.sendLinks !== false;
  let channels = options.channels || {};
  if (sendLinks && channels.email === undefined && channels.whatsapp === undefined) {
    const { getScheduleReminderSettings } = require("./scheduleReminderService");
    const prefs = await getScheduleReminderSettings(actorUserId);
    channels = { email: prefs.inviteEmail, whatsapp: prefs.inviteWhatsapp };
  }
  const created = [];
  const deliverySummary = { emailSent: 0, whatsappSent: 0, failed: 0 };

  for (const row of rows) {
    const candidate = await createScheduleCandidate(actorUserId, row);
    created.push(candidate);

    if (!sendLinks) continue;

    try {
      const result = await sendDirectSchedulingLink(actorUserId, candidate.id, {
        meetingUri: row.meetingUri,
        meetingName: row.meetingName,
        schedulingUrl: row.schedulingUrl,
        channels,
      });
      if (result.emailSent) deliverySummary.emailSent += 1;
      if (result.whatsappSent) deliverySummary.whatsappSent += 1;
      const idx = created.length - 1;
      created[idx] = result.candidate;
    } catch {
      deliverySummary.failed += 1;
    }
  }

  return { candidates: created, deliverySummary };
}

async function findScheduleCandidateInScope(actorUserId, candidateId) {
  if (!mongoose.Types.ObjectId.isValid(candidateId)) throw badRequest("Invalid candidate id");
  const doc = await ScheduleCandidate.findOne({
    _id: candidateId,
    userId: actorUserId,
  });
  if (!doc) throw notFound("Schedule candidate not found");
  return doc;
}

async function sendDirectSchedulingLink(actorUserId, candidateId, meeting = {}) {
  const doc = await findScheduleCandidateInScope(actorUserId, candidateId);

  let meetingUri = String(meeting.meetingUri || doc.meetingUri || "").trim();
  let meetingName = String(meeting.meetingName || doc.meetingName || "").trim();
  let schedulingUrl = String(meeting.schedulingUrl || doc.schedulingUrl || "").trim();

  if (!schedulingUrl) {
    const { meetings } = await listCalendlyEventTypesForUser(actorUserId);
    const picked = meetingUri
      ? meetings.find((m) => m.uri === meetingUri)
      : meetings[0];
    if (!picked) {
      throw badRequest("Connect Calendly and choose a meeting type before sending a scheduling link.");
    }
    meetingUri = picked.uri;
    meetingName = picked.name;
    schedulingUrl = picked.schedulingUrl;
  }

  const link = buildSchedulingUrl(schedulingUrl, {
    name: doc.name,
    email: doc.email,
  });

  const { deliverCalendlyLink } = require("./scheduleLinkDeliveryService");
  let channels = meeting.channels || {};
  if (channels.email === undefined && channels.whatsapp === undefined) {
    const { getScheduleReminderSettings } = require("./scheduleReminderService");
    const prefs = await getScheduleReminderSettings(actorUserId);
    channels = { email: prefs.inviteEmail, whatsapp: prefs.inviteWhatsapp };
  }
  const delivery = await deliverCalendlyLink({
    userId: actorUserId,
    candidateName: doc.name,
    email: doc.email,
    phone: doc.phone,
    schedulingUrl: link,
    meetingName,
    role: doc.role || "",
    channels,
  });

  doc.meetingUri = meetingUri;
  doc.meetingName = meetingName;
  doc.schedulingUrl = schedulingUrl;
  doc.status = "link_sent";
  await doc.save();

  return {
    candidate: formatScheduleCandidate(doc),
    schedulingUrl: link,
    emailSent: delivery.emailSent,
    whatsappSent: delivery.whatsappSent,
    deliveryErrors: delivery.errors,
  };
}

async function matchScheduleCandidatesForWebhook(eventTypeUri, inviteeEmail) {
  const key = String(eventTypeUri || "").trim();
  const email = normalizeEmail(inviteeEmail);
  if (!key || !email) return [];

  return ScheduleCandidate.find({
    meetingUri: key,
    email,
    status: { $in: ["pending", "link_sent", "scheduled"] },
  });
}

module.exports = {
  getScheduleOverview,
  syncAllScheduleBookings,
  syncAccountCalendlyBookings,
  syncDirectScheduleBookings,
  listScheduleCandidates,
  createScheduleCandidate,
  createScheduleCandidatesBatch,
  sendDirectSchedulingLink,
  findScheduleCandidateInScope,
  upsertDirectBooking,
  matchScheduleCandidatesForWebhook,
  formatScheduleCandidate,
};
