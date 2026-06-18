const mongoose = require("mongoose");
/**
 * Voice-call channel only. Reads/writes the `campaign_voice_calls` collection.
 * Does not touch gmail/whatsapp enrollments, messages, or reply sync.
 */
const Campaign = require("../models/Campaign");
const CampaignVoiceCall = require("../models/CampaignVoiceCall");
const { findCampaignInScope } = require("../utils/campaignScope");
const {
  loadAllContactsForCampaign,
  listCampaignContactsPaginated,
} = require("./campaignContactService");
const { normalizeToWhatsAppDigits } = require("./whatsappPhoneUtils");

function userOid(userId) {
  return new mongoose.Types.ObjectId(String(userId));
}

function campaignOid(campaignId) {
  return new mongoose.Types.ObjectId(String(campaignId));
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseCampaignIdFromRequestId(requestId) {
  const raw = String(requestId || "").trim();
  if (!raw) return "";
  const match = raw.match(/^([a-f0-9]{24})-/i);
  return match ? match[1] : "";
}

function resolveCampaignId(campaignId, body) {
  const fromQuery = String(campaignId || "").trim();
  if (mongoose.Types.ObjectId.isValid(fromQuery)) return fromQuery;
  return parseCampaignIdFromRequestId(body?.request_id);
}

function buildPhoneToContactMap(contacts) {
  const map = new Map();
  for (const contact of contacts) {
    const digits = normalizeToWhatsAppDigits(contact.phone);
    if (!digits) continue;
    map.set(digits, contact);
  }
  return map;
}

function matchContactForNumber(contacts, toNumber) {
  const digits = normalizeToWhatsAppDigits(toNumber);
  if (!digits) return null;
  const map = buildPhoneToContactMap(contacts);
  return map.get(digits) || null;
}

function extractRecordingUrl(body) {
  return String(
    body?.recording_url || body?.call_recording_url || body?.url || ""
  ).trim();
}

function extractSummaryText(body) {
  const fromResult =
    body?.result &&
    typeof body.result === "object" &&
    typeof body.result.summary === "string"
      ? body.result.summary.trim()
      : "";
  if (fromResult) return fromResult;
  if (typeof body?.summary === "string" && body.summary.trim()) {
    return body.summary.trim();
  }
  if (typeof body?.call_summary === "string" && body.call_summary.trim()) {
    return body.call_summary.trim();
  }
  if (typeof body?.text === "string" && body.text.trim()) {
    return body.text.trim();
  }
  return "";
}

function parseHunarCallResult(body) {
  const raw = body?.result && typeof body.result === "object" ? body.result : null;
  if (!raw) return null;
  return {
    summary: String(raw.summary || "").trim(),
    callbackTime: String(raw.callback_time || "").trim(),
    finalOutcome: String(raw.final_outcome || "").trim(),
    interestLevel: String(raw.interest_level || "").trim(),
    candidateStatus: String(raw.candidate_status || "").trim(),
    callbackRequested: String(raw.callback_requested || "").trim(),
    candidateQuestions: Array.isArray(raw.candidate_questions)
      ? raw.candidate_questions.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
    objectionsOrConcerns: Array.isArray(raw.objections_or_concerns)
      ? raw.objections_or_concerns.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
  };
}

function formatCallResult(o) {
  if (!o || typeof o !== "object") return null;
  const summary = String(o.summary || "").trim();
  const finalOutcome = String(o.finalOutcome || "").trim();
  const interestLevel = String(o.interestLevel || "").trim();
  const candidateStatus = String(o.candidateStatus || "").trim();
  const callbackRequested = String(o.callbackRequested || "").trim();
  const callbackTime = String(o.callbackTime || "").trim();
  const candidateQuestions = Array.isArray(o.candidateQuestions)
    ? o.candidateQuestions.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const objectionsOrConcerns = Array.isArray(o.objectionsOrConcerns)
    ? o.objectionsOrConcerns.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  if (
    !summary &&
    !finalOutcome &&
    !interestLevel &&
    !candidateStatus &&
    !callbackRequested &&
    !callbackTime &&
    candidateQuestions.length === 0 &&
    objectionsOrConcerns.length === 0
  ) {
    return null;
  }
  return {
    summary,
    callbackTime,
    finalOutcome,
    interestLevel,
    candidateStatus,
    callbackRequested,
    candidateQuestions,
    objectionsOrConcerns,
  };
}

function resolveCallResult(doc) {
  const fromField = formatCallResult(doc?.callResult);
  if (fromField) return fromField;
  return formatCallResult(parseHunarCallResult(doc?.resultPayload));
}

function resolveSummaryText(doc, callResult) {
  const direct = String(doc?.summaryText || "").trim();
  if (direct) return direct;
  if (callResult?.summary) return callResult.summary;
  return extractSummaryText(doc?.summaryPayload) || "";
}
async function loadCampaignForWebhook(campaignId, body) {
  const resolvedId = resolveCampaignId(campaignId, body);
  if (!mongoose.Types.ObjectId.isValid(resolvedId)) return null;
  const campaign = await Campaign.findById(resolvedId).lean();
  if (!campaign || campaign.outreachChannel !== "voice_call") return null;
  return campaign;
}

async function resolveVoiceCallWebhook(campaignId, body) {
  const campaign = await loadCampaignForWebhook(campaignId, body);
  if (!campaign) {
    const err = new Error("Voice campaign not found for callback");
    err.statusCode = 404;
    throw err;
  }

  const callId = String(body?.call_id || "").trim();
  if (!callId) {
    const err = new Error("call_id is required");
    err.statusCode = 400;
    throw err;
  }

  const contacts = await loadAllContactsForCampaign(String(campaign._id));
  const matched = matchContactForNumber(contacts, body?.to_number);
  const existing = await CampaignVoiceCall.findOne({
    campaignId: campaign._id,
    callId,
  }).lean();

  return { campaign, callId, matched, existing };
}

function baseCallFields(campaign, callId, matched, existing, body) {
  return {
    userId: campaign.userId,
    campaignId: campaign._id,
    callId,
    requestId: String(body?.request_id || existing?.requestId || "").trim(),
    agentId: String(body?.agent_id || existing?.agentId || "").trim(),
    candidateKey: matched?.candidateKey || existing?.candidateKey || "",
    contactName: matched?.name || existing?.contactName || "",
    toNumber: String(body?.to_number || existing?.toNumber || "").trim(),
    fromPhoneNumber: String(
      body?.from_phone_number || existing?.fromPhoneNumber || ""
    ).trim(),
    lastEventAt: new Date(),
  };
}

function formatVoiceCallRow(doc) {
  const o = doc && typeof doc.toObject === "function" ? doc.toObject() : doc || {};
  const callResult = resolveCallResult(o);
  return {
    id: String(o._id),
    callId: o.callId || "",
    requestId: o.requestId || "",
    agentId: o.agentId || "",
    candidateKey: o.candidateKey || "",
    contactName: o.contactName || "",
    toNumber: o.toNumber || "",
    fromPhoneNumber: o.fromPhoneNumber || "",
    status: o.status || "",
    lifecycleStatus: o.lifecycleStatus || "",
    answeredBy: o.answeredBy || "",
    durationSeconds:
      typeof o.durationSeconds === "number" ? o.durationSeconds : null,
    durationMinutes:
      typeof o.durationMinutes === "number" ? o.durationMinutes : null,
    eventType: o.eventType || "",
    timezone: o.timezone || "",
    retryCount: typeof o.retryCount === "number" ? o.retryCount : 0,
    maxRetries: typeof o.maxRetries === "number" ? o.maxRetries : 0,
    createdAtHunar: o.createdAtHunar
      ? new Date(o.createdAtHunar).toISOString()
      : null,
    startedAt: o.startedAt ? new Date(o.startedAt).toISOString() : null,
    endedAt: o.endedAt ? new Date(o.endedAt).toISOString() : null,
    lastEventAt: o.lastEventAt
      ? new Date(o.lastEventAt).toISOString()
      : o.updatedAt
        ? new Date(o.updatedAt).toISOString()
        : null,
    statusPayload: o.statusPayload || null,
    resultPayload: o.resultPayload || null,
    callResult,
    recordingUrl: o.recordingUrl || "",
    recordingPayload: o.recordingPayload || null,
    summaryText: resolveSummaryText(o, callResult),
    summaryPayload: o.summaryPayload || null,
  };
}

async function upsertVoiceCallStatus(campaignId, body) {
  const { campaign, callId, matched } = await resolveVoiceCallWebhook(campaignId, body);

  const update = {
    ...baseCallFields(campaign, callId, matched, null, body),
    status: String(body?.status || "").trim(),
    lifecycleStatus: String(body?.lifecycle_status || "").trim(),
    answeredBy: String(body?.answered_by || "").trim(),
    durationSeconds:
      typeof body?.duration_seconds === "number" ? body.duration_seconds : null,
    durationMinutes:
      typeof body?.duration_minutes === "number" ? body.duration_minutes : null,
    eventType: String(body?.event_type || "call_status_updated").trim(),
    timezone: String(body?.timezone || "").trim(),
    retryCount: typeof body?.retry_count === "number" ? body.retry_count : 0,
    maxRetries: typeof body?.max_retries === "number" ? body.max_retries : 0,
    createdAtHunar: parseDate(body?.created_at),
    startedAt: parseDate(body?.started_at),
    endedAt: parseDate(body?.ended_at),
    statusPayload: body || null,
  };

  const doc = await CampaignVoiceCall.findOneAndUpdate(
    { campaignId: campaign._id, callId },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const row = formatVoiceCallRow(doc);
  void afterVoiceCallWebhook(String(campaign._id));
  return row;
}

async function upsertVoiceCallResult(campaignId, body) {
  const { campaign, callId, matched, existing } = await resolveVoiceCallWebhook(
    campaignId,
    body
  );

  const update = {
    ...baseCallFields(campaign, callId, matched, existing, body),
    resultPayload: body || null,
  };

  const parsedResult = parseHunarCallResult(body);
  if (parsedResult) {
    update.callResult = parsedResult;
    if (parsedResult.summary) {
      update.summaryText = parsedResult.summary;
    }
  }

  if (body?.status) update.status = String(body.status).trim();
  if (body?.lifecycle_status) {
    update.lifecycleStatus = String(body.lifecycle_status).trim();
  }
  if (body?.answered_by) update.answeredBy = String(body.answered_by).trim();
  if (typeof body?.duration_seconds === "number") {
    update.durationSeconds = body.duration_seconds;
  }
  if (typeof body?.duration_minutes === "number") {
    update.durationMinutes = body.duration_minutes;
  }
  if (body?.event_type) update.eventType = String(body.event_type).trim();
  if (body?.started_at) update.startedAt = parseDate(body.started_at);
  if (body?.ended_at) update.endedAt = parseDate(body.ended_at);

  const doc = await CampaignVoiceCall.findOneAndUpdate(
    { campaignId: campaign._id, callId },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const row = formatVoiceCallRow(doc);
  void afterVoiceCallWebhook(String(campaign._id));
  return row;
}

async function upsertVoiceCallRecording(campaignId, body) {
  const { campaign, callId, matched, existing } = await resolveVoiceCallWebhook(
    campaignId,
    body
  );

  const update = {
    ...baseCallFields(campaign, callId, matched, existing, body),
    recordingUrl: extractRecordingUrl(body),
    recordingPayload: body || null,
    eventType: String(body?.event_type || "call_recording").trim(),
  };

  const doc = await CampaignVoiceCall.findOneAndUpdate(
    { campaignId: campaign._id, callId },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return formatVoiceCallRow(doc);
}

async function upsertVoiceCallSummary(campaignId, body) {
  const { campaign, callId, matched, existing } = await resolveVoiceCallWebhook(
    campaignId,
    body
  );

  const update = {
    ...baseCallFields(campaign, callId, matched, existing, body),
    summaryText: extractSummaryText(body),
    summaryPayload: body || null,
    eventType: String(body?.event_type || "call_summary").trim(),
  };

  const doc = await CampaignVoiceCall.findOneAndUpdate(
    { campaignId: campaign._id, callId },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return formatVoiceCallRow(doc);
}

function pickLatestCallForContact(callsByKey, callsByPhone, contact) {
  const byKey = callsByKey.get(contact.candidateKey);
  if (byKey) return byKey;

  const digits = normalizeToWhatsAppDigits(contact.phone);
  if (digits && callsByPhone.has(digits)) {
    return callsByPhone.get(digits);
  }
  return null;
}

function normalizeCallStatus(value) {
  return String(value || "").trim().toUpperCase();
}

const VOICE_CALL_IN_FLIGHT_STATUSES = new Set([
  "PENDING",
  "RINGING",
  "IN_PROGRESS",
  "SCHEDULED",
  "QUEUED",
  "INITIATED",
  "DIALING",
]);

const VOICE_CALL_TERMINAL_STATUSES = new Set([
  "COMPLETED",
  "FAILED",
  "NO_ANSWER",
  "BUSY",
  "CANCELLED",
  "CANCELED",
  "UNANSWERED",
  "NOT_REACHABLE",
]);

function hasVoiceCallRetriesPending(call) {
  if (!call) return false;
  const payload = call.statusPayload;
  if (payload && typeof payload === "object") {
    if (typeof payload.retries_left === "number" && payload.retries_left > 0) {
      return true;
    }
    if (
      typeof payload.next_retry_scheduled_at === "string" &&
      payload.next_retry_scheduled_at.trim()
    ) {
      return true;
    }
  }

  const maxRetries = typeof call.maxRetries === "number" ? call.maxRetries : 0;
  const retryCount = typeof call.retryCount === "number" ? call.retryCount : 0;
  if (maxRetries <= 0 || retryCount >= maxRetries) return false;

  const status = normalizeCallStatus(call.status);
  return status === "NO_ANSWER" || status === "FAILED" || status === "BUSY";
}

function isVoiceCallTerminal(call) {
  if (!call) return false;
  if (hasVoiceCallRetriesPending(call)) return false;

  const lifecycle = normalizeCallStatus(call.lifecycleStatus);
  const status = normalizeCallStatus(call.status);

  if (lifecycle === "COMPLETED") return true;
  if (String(call.eventType || "").trim() === "call_result_done") return true;
  if (VOICE_CALL_TERMINAL_STATUSES.has(status)) return true;
  if (VOICE_CALL_TERMINAL_STATUSES.has(lifecycle)) return true;

  if (call.endedAt) {
    if (!VOICE_CALL_IN_FLIGHT_STATUSES.has(status) && status) return true;
    if (!VOICE_CALL_IN_FLIGHT_STATUSES.has(lifecycle) && lifecycle) return true;
  }

  return false;
}

function indexLatestCalls(callDocs) {
  const byKey = new Map();
  const byPhone = new Map();

  for (const doc of callDocs) {
    const formatted = formatVoiceCallRow(doc);
    const ts = new Date(formatted.lastEventAt || 0).getTime();

    if (formatted.candidateKey) {
      const prev = byKey.get(formatted.candidateKey);
      if (!prev || ts >= new Date(prev.lastEventAt || 0).getTime()) {
        byKey.set(formatted.candidateKey, formatted);
      }
    }

    const digits = normalizeToWhatsAppDigits(formatted.toNumber);
    if (digits) {
      const prev = byPhone.get(digits);
      if (!prev || ts >= new Date(prev.lastEventAt || 0).getTime()) {
        byPhone.set(digits, formatted);
      }
    }
  }

  return { byKey, byPhone };
}

async function maybeCompleteVoiceCampaign(campaignId) {
  const cid = campaignOid(campaignId);
  const campaign = await Campaign.findOne({
    _id: cid,
    outreachChannel: "voice_call",
    outreachStatus: "active",
  }).lean();
  if (!campaign) return false;

  const contacts = await loadAllContactsForCampaign(String(campaignId));
  const dialableContacts = contacts.filter((contact) =>
    Boolean(normalizeToWhatsAppDigits(contact.phone))
  );
  if (dialableContacts.length === 0) return false;

  const callDocs = await CampaignVoiceCall.find({ campaignId: cid }).lean();
  if (callDocs.length === 0) return false;

  const { byKey, byPhone } = indexLatestCalls(callDocs);

  for (const contact of dialableContacts) {
    const call = pickLatestCallForContact(byKey, byPhone, contact);
    if (!isVoiceCallTerminal(call)) return false;
  }

  const result = await Campaign.updateOne(
    { _id: cid, outreachStatus: "active" },
    { $set: { outreachStatus: "completed" } }
  );
  if (!result.modifiedCount) return false;

  const { notifyCampaignThreadUpdated } = require("../realtime/notify");
  notifyCampaignThreadUpdated(String(campaign.userId), {
    campaignId: String(campaignId),
    candidateKey: "",
    newMessages: 0,
    hasNewCandidateReply: false,
    source: "campaign_completed",
    outreachStatus: "completed",
  });

  console.info("[hunar-voice] campaign auto-completed", {
    campaignId: String(campaignId),
    contactCount: dialableContacts.length,
  });

  return true;
}

async function afterVoiceCallWebhook(campaignId) {
  try {
    await maybeCompleteVoiceCampaign(campaignId);
  } catch (error) {
    console.error(
      "[hunar-voice] maybeCompleteVoiceCampaign failed:",
      error?.message || error
    );
  }
}

async function getCampaignVoiceCalls(actorUserId, campaignId, options = {}) {
  const campaign = await findCampaignInScope(actorUserId, campaignId);
  if (campaign.outreachChannel !== "voice_call") {
    const err = new Error("This campaign is not configured for AI voice calls.");
    err.statusCode = 400;
    throw err;
  }

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 25));

  const [contactsPage, callDocs] = await Promise.all([
    listCampaignContactsPaginated(campaignId, { page, limit }),
    CampaignVoiceCall.find({ campaignId: campaignOid(campaignId) })
      .sort({ lastEventAt: -1, updatedAt: -1 })
      .lean(),
  ]);

  const callsByKey = new Map();
  const callsByPhone = new Map();
  for (const doc of callDocs) {
    const formatted = formatVoiceCallRow(doc);
    const ts = new Date(formatted.lastEventAt || 0).getTime();

    if (formatted.candidateKey) {
      const prev = callsByKey.get(formatted.candidateKey);
      if (!prev || ts >= new Date(prev.lastEventAt || 0).getTime()) {
        callsByKey.set(formatted.candidateKey, formatted);
      }
    }

    const digits = normalizeToWhatsAppDigits(formatted.toNumber);
    if (digits) {
      const prev = callsByPhone.get(digits);
      if (!prev || ts >= new Date(prev.lastEventAt || 0).getTime()) {
        callsByPhone.set(digits, formatted);
      }
    }
  }

  const rows = contactsPage.contacts.map((contact) => {
    const call = pickLatestCallForContact(callsByKey, callsByPhone, contact);
    const displayStatus =
      call?.status ||
      call?.lifecycleStatus ||
      "PENDING";
    return {
      contact,
      call,
      displayStatus,
    };
  });

  return {
    campaignId: String(campaign._id),
    outreachStatus: campaign.outreachStatus || "idle",
    outreachChannel: "voice_call",
    rows,
    pagination: contactsPage.pagination,
  };
}

async function deleteVoiceCallsForCampaign(campaignId) {
  if (!mongoose.Types.ObjectId.isValid(String(campaignId))) return { deleted: 0 };
  const result = await CampaignVoiceCall.deleteMany({
    campaignId: campaignOid(campaignId),
  });
  return { deleted: result.deletedCount || 0 };
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function sortReportCandidates(list) {
  return [...list].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

function classifyVoiceDisposition(callResult) {
  if (!callResult) return "unknown";
  const text = [
    callResult.finalOutcome,
    callResult.interestLevel,
    callResult.candidateStatus,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
  if (!text) return "unknown";

  if (
    text.includes("not interested") ||
    text.includes("declined") ||
    text.includes("rejected")
  ) {
    return "not_interested";
  }
  if (
    text.includes("callback") ||
    text.includes("interest") ||
    text.includes("confirmed") ||
    text.includes("qualified") ||
    text.includes("positive")
  ) {
    return "interested";
  }
  return "unknown";
}

function hasVoiceConversation(call) {
  if (!call) return false;
  if (call.callResult) {
    const result = call.callResult;
    if (
      result.finalOutcome ||
      result.interestLevel ||
      result.candidateStatus ||
      result.summary
    ) {
      return true;
    }
  }
  const lifecycle = normalizeCallStatus(call.lifecycleStatus);
  const status = normalizeCallStatus(call.status);
  if (lifecycle === "COMPLETED" || status === "COMPLETED") return true;
  return String(call.eventType || "").trim() === "call_result_done";
}

function isVoiceCallAttempted(call) {
  if (!call) return false;
  if (call.startedAt) return true;
  const status = normalizeCallStatus(call.status);
  const lifecycle = normalizeCallStatus(call.lifecycleStatus);
  if (status && status !== "PENDING") return true;
  if (lifecycle && lifecycle !== "PENDING") return true;
  return Boolean(call.callId);
}

function isVoiceDeliveryFailure(call) {
  if (!call || hasVoiceConversation(call)) return false;
  if (!isVoiceCallTerminal(call)) return false;
  const status = normalizeCallStatus(call.status);
  const lifecycle = normalizeCallStatus(call.lifecycleStatus);
  return status === "FAILED" || lifecycle === "FAILED";
}

function formatVoiceReportCandidate(contact, call, { status } = {}) {
  const name = String(contact?.name || call?.contactName || "").trim() || "Unnamed contact";
  const enrollmentStatus =
    status ||
    normalizeCallStatus(call?.status) ||
    normalizeCallStatus(call?.lifecycleStatus) ||
    (call ? "active" : "pending");
  const disposition = call?.callResult ? classifyVoiceDisposition(call.callResult) : "unknown";
  const hasReply = hasVoiceConversation(call);
  let detail = "";
  if (enrollmentStatus === "skipped" || status === "skipped") {
    detail = "No phone on file";
  } else if (isVoiceDeliveryFailure(call)) {
    detail = String(call?.status || call?.lifecycleStatus || "").trim() || "Call failed";
  } else if (disposition === "interested") {
    detail = call?.callResult?.finalOutcome || "Interested";
  } else if (disposition === "not_interested") {
    detail = call?.callResult?.finalOutcome || "Not interested";
  } else if (hasReply) {
    detail = call?.callResult?.finalOutcome || call?.callResult?.interestLevel || "Call completed";
  } else if (isVoiceCallAttempted(call)) {
    detail = "Call placed";
  }

  return {
    candidateKey: String(contact?.candidateKey || call?.candidateKey || "").trim(),
    name,
    email: String(contact?.email || "").trim(),
    phone: String(contact?.phone || call?.toNumber || "").trim(),
    role: String(contact?.role || "").trim(),
    company: String(contact?.company || "").trim(),
    enrollmentStatus,
    replyDisposition: disposition,
    sentCount: isVoiceCallAttempted(call) ? 1 : 0,
    hasReply,
    detail,
    lastSentAt: call?.startedAt || null,
    lastReplyAt: hasReply ? call?.endedAt || call?.lastEventAt || null : null,
  };
}

async function loadVoiceCampaignReportContext(actorUserId, campaignId) {
  const campaign = await findCampaignInScope(actorUserId, campaignId, {
    select: "outreachChannel outreachStatus outreachStartedAt name userId contactCount",
  });
  if (campaign.outreachChannel !== "voice_call") {
    const err = new Error("This campaign is not configured for AI voice calls.");
    err.statusCode = 400;
    throw err;
  }

  const {
    countContactsForCampaign,
    countContactsWithEmail,
    countContactsWithPhone,
  } = require("./campaignContactService");

  const [totalContacts, contactsWithEmail, contactsWithPhone, contacts, callDocs] =
    await Promise.all([
      countContactsForCampaign(campaignId),
      countContactsWithEmail(campaignId),
      countContactsWithPhone(campaignId),
      loadAllContactsForCampaign(campaignId),
      CampaignVoiceCall.find({ campaignId: campaignOid(campaignId) }).lean(),
    ]);

  const { byKey, byPhone } = indexLatestCalls(callDocs);

  return {
    campaign,
    contacts,
    byKey,
    byPhone,
    totalContacts,
    contactsWithEmail,
    contactsWithPhone,
    callDocs,
  };
}

function buildVoiceCampaignReportFromContext(ctx) {
  const { campaign, contacts, byKey, byPhone, totalContacts, contactsWithEmail, contactsWithPhone } =
    ctx;

  let enrolled = 0;
  let sent = 0;
  let notDelivered = 0;
  let replied = 0;
  let interested = 0;
  let notInterested = 0;

  const breakdown = {
    sent: [],
    replied: [],
    interested: [],
    not_interested: [],
    not_delivered: [],
    awaiting_reply: [],
  };

  const outreachStarted =
    campaign.outreachStatus === "active" || campaign.outreachStatus === "completed";

  for (const contact of contacts) {
    const hasPhone = Boolean(normalizeToWhatsAppDigits(contact.phone));
    const call = pickLatestCallForContact(byKey, byPhone, contact);

    if (!hasPhone) {
      notDelivered += 1;
      breakdown.not_delivered.push(
        formatVoiceReportCandidate(contact, null, { status: "skipped" })
      );
      continue;
    }

    enrolled += 1;
    const candidate = formatVoiceReportCandidate(contact, call);

    if (isVoiceDeliveryFailure(call)) {
      notDelivered += 1;
      breakdown.not_delivered.push(candidate);
      continue;
    }

    if (!isVoiceCallAttempted(call)) {
      if (outreachStarted) {
        breakdown.awaiting_reply.push(candidate);
      }
      continue;
    }

    sent += 1;
    breakdown.sent.push(candidate);

    if (hasVoiceConversation(call)) {
      replied += 1;
      breakdown.replied.push(candidate);
      const disposition = classifyVoiceDisposition(call.callResult);
      if (disposition === "interested") {
        interested += 1;
        breakdown.interested.push(candidate);
      } else if (disposition === "not_interested") {
        notInterested += 1;
        breakdown.not_interested.push(candidate);
      }
    } else if (!isVoiceCallTerminal(call) || outreachStarted) {
      breakdown.awaiting_reply.push(candidate);
    }
  }

  const awaitingReply = Math.max(0, sent - replied);
  const sentDenom = sent || 0;

  const matrix = [
    {
      key: "sent",
      label: "Called",
      count: sent,
      rate: sentDenom > 0 ? 100 : 0,
      description: "Contacts who received at least one call attempt",
    },
    {
      key: "replied",
      label: "Answered",
      count: replied,
      rate: pct(replied, sentDenom),
      description: "Calls answered with a conversation outcome from the AI agent",
    },
    {
      key: "interested",
      label: "Interested",
      count: interested,
      rate: pct(interested, sentDenom),
      description: "Candidates classified as interested by the AI voice agent",
    },
    {
      key: "not_interested",
      label: "Not interested",
      count: notInterested,
      rate: pct(notInterested, sentDenom),
      description: "Candidates classified as not interested by the AI voice agent",
    },
    {
      key: "not_delivered",
      label: "Not reached",
      count: notDelivered,
      rate: pct(notDelivered, contacts.length || totalContacts),
      description: "Skipped (no phone) or failed to connect",
    },
    {
      key: "awaiting_reply",
      label: "Awaiting outcome",
      count: awaitingReply,
      rate: pct(awaitingReply, sentDenom),
      description: "Call placed but no conversation outcome yet",
    },
  ];

  for (const key of Object.keys(breakdown)) {
    breakdown[key] = sortReportCandidates(breakdown[key]);
  }

  return {
    channel: "voice_call",
    campaignName: campaign.name || "",
    outreachStatus: campaign.outreachStatus || "idle",
    outreachStartedAt: campaign.outreachStartedAt || null,
    totalContacts,
    contactsWithEmail,
    contactsWithPhone,
    enrolled,
    sent,
    replied,
    interested,
    notInterested,
    notDelivered,
    awaitingReply,
    matrix,
    breakdown,
    note: null,
  };
}

function buildVoiceActivities(callDocs, contacts, campaign) {
  const activities = [];
  const outreachStartedAt = campaign.outreachStartedAt
    ? new Date(campaign.outreachStartedAt).toISOString()
    : null;

  for (const contact of contacts) {
    if (normalizeToWhatsAppDigits(contact.phone)) continue;
    activities.push({
      type: "skipped",
      candidateKey: contact.candidateKey || "",
      contactName: String(contact.name || "").trim() || "Contact",
      contactEmail: String(contact.email || "").trim(),
      contactPhone: "",
      at: outreachStartedAt || new Date().toISOString(),
      detail: "No phone on file",
    });
  }

  for (const doc of callDocs) {
    const call = formatVoiceCallRow(doc);
    const name = String(call.contactName || "").trim() || "Contact";
    const candidateKey = String(call.candidateKey || "").trim();
    const contactPhone = String(call.toNumber || "").trim();

    if (isVoiceCallAttempted(call)) {
      activities.push({
        type: "sent",
        candidateKey,
        contactName: name,
        contactEmail: "",
        contactPhone,
        at: call.startedAt || call.lastEventAt || new Date().toISOString(),
        detail: "Call started",
      });
    }

    if (hasVoiceConversation(call)) {
      const disposition = classifyVoiceDisposition(call.callResult);
      const outcomeLabel =
        call.callResult?.finalOutcome ||
        call.callResult?.interestLevel ||
        "Call completed";
      activities.push({
        type:
          disposition === "interested"
            ? "interested"
            : disposition === "not_interested"
              ? "not_interested"
              : "reply",
        candidateKey,
        contactName: name,
        contactEmail: "",
        contactPhone,
        at: call.endedAt || call.lastEventAt || new Date().toISOString(),
        detail: outcomeLabel,
      });
      continue;
    }

    if (isVoiceDeliveryFailure(call)) {
      activities.push({
        type: "failed",
        candidateKey,
        contactName: name,
        contactEmail: "",
        contactPhone,
        at: call.endedAt || call.lastEventAt || new Date().toISOString(),
        detail: String(call.status || call.lifecycleStatus || "").trim() || "Call failed",
      });
    }
  }

  activities.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return activities;
}

function parseVoiceActivityPagination(options = {}) {
  const pageRaw = Number(options.page);
  const limitRaw = Number(options.limit);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit = Math.min(
    50,
    Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 20)
  );
  return { page, limit };
}

function paginateVoiceActivityList(items, page, limit) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * limit;
  return {
    activities: items.slice(skip, skip + limit),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasMore: safePage < totalPages,
    },
  };
}

/**
 * Outreach metrics for voice-call campaign Report tab.
 */
async function getVoiceCampaignReport(actorUserId, campaignId) {
  const ctx = await loadVoiceCampaignReportContext(actorUserId, campaignId);
  return buildVoiceCampaignReportFromContext(ctx);
}

/**
 * Paginated outreach activity for voice-call campaign Activity tab.
 */
async function getVoiceCampaignReportActivity(actorUserId, campaignId, options = {}) {
  const { page, limit } = parseVoiceActivityPagination(options);
  const ctx = await loadVoiceCampaignReportContext(actorUserId, campaignId);
  const voiceActivities = buildVoiceActivities(ctx.callDocs, ctx.contacts, ctx.campaign);
  const { buildUnveilActivitiesForCampaign } = require("./campaignRevealActivityService");
  const unveilActivities = await buildUnveilActivitiesForCampaign(actorUserId, campaignId);
  const allActivities = [...voiceActivities, ...unveilActivities].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
  const { activities, pagination } = paginateVoiceActivityList(allActivities, page, limit);

  return {
    channel: "voice_call",
    campaignName: ctx.campaign.name || "",
    outreachStatus: ctx.campaign.outreachStatus || "idle",
    activities,
    pagination,
  };
}

function indexLatestVoiceCallsByCandidate(callDocs) {
  const byCampaign = new Map();

  for (const doc of callDocs) {
    const campaignId = String(doc.campaignId || "");
    if (!campaignId) continue;

    const candidateKey = String(doc.candidateKey || doc.toNumber || doc.callId || doc._id || "").trim();
    if (!candidateKey) continue;

    if (!byCampaign.has(campaignId)) {
      byCampaign.set(campaignId, new Map());
    }
    const byCandidate = byCampaign.get(campaignId);
    const existing = byCandidate.get(candidateKey);
    const existingAt = existing
      ? new Date(existing.lastEventAt || existing.updatedAt || 0).getTime()
      : 0;
    const nextAt = new Date(doc.lastEventAt || doc.updatedAt || 0).getTime();
    if (!existing || nextAt >= existingAt) {
      byCandidate.set(candidateKey, doc);
    }
  }

  return byCampaign;
}

function summarizeVoiceCampaignListStats(byCandidate) {
  let sent = 0;
  let interested = 0;
  let maxLastEvent = null;

  for (const call of byCandidate.values()) {
    const eventAt = call.lastEventAt || call.endedAt || call.startedAt;
    if (eventAt) {
      const stamp = new Date(eventAt);
      if (!Number.isNaN(stamp.getTime()) && (!maxLastEvent || stamp > maxLastEvent)) {
        maxLastEvent = stamp;
      }
    }

    if (isVoiceCallAttempted(call)) {
      sent += 1;
    }

    const callResult = resolveCallResult(call);
    const callWithResult = callResult ? { ...call, callResult } : call;
    if (hasVoiceConversation(callWithResult)) {
      if (classifyVoiceDisposition(callResult) === "interested") {
        interested += 1;
      }
    }
  }

  return {
    sent,
    interested,
    maxLastSent: maxLastEvent,
    maxLastReply: maxLastEvent,
    maxDispositionAt: maxLastEvent,
  };
}

/**
 * Campaign list metrics for voice_call channel (mirrors enrollment stats shape).
 */
async function loadVoiceCampaignListStats(actorUserId, campaignIds) {
  if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
    return new Map();
  }

  const oids = campaignIds
    .filter((id) => mongoose.Types.ObjectId.isValid(String(id)))
    .map((id) => new mongoose.Types.ObjectId(String(id)));
  if (oids.length === 0) return new Map();

  const { campaignAccessFilterForActor } = require("../utils/campaignScope");
  const access = await campaignAccessFilterForActor(actorUserId);
  const match = { campaignId: { $in: oids } };
  if (access?.userId) {
    match.userId = access.userId;
  }

  const callDocs = await CampaignVoiceCall.find(match)
    .select(
      "campaignId candidateKey toNumber callId callResult resultPayload status lifecycleStatus startedAt endedAt lastEventAt updatedAt eventType"
    )
    .lean();

  const byCampaign = indexLatestVoiceCallsByCandidate(callDocs);
  const map = new Map();
  for (const campaignId of oids.map((id) => String(id))) {
    const byCandidate = byCampaign.get(campaignId) || new Map();
    map.set(campaignId, summarizeVoiceCampaignListStats(byCandidate));
  }
  return map;
}

module.exports = {
  upsertVoiceCallStatus,
  upsertVoiceCallResult,
  upsertVoiceCallRecording,
  upsertVoiceCallSummary,
  getCampaignVoiceCalls,
  deleteVoiceCallsForCampaign,
  maybeCompleteVoiceCampaign,
  isVoiceCallTerminal,
  getVoiceCampaignReport,
  getVoiceCampaignReportActivity,
  loadVoiceCampaignListStats,
};
