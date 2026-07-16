const mongoose = require("mongoose");
const OutreachModuleCampaign = require("../models/OutreachModuleCampaign");
const CampaignVoiceCall = require("../models/CampaignVoiceCall");
const { userIdFilterForActor } = require("../utils/orgScope");
const { extractVoiceJdDetailsFromGemini, fallbackJdExtract } = require("./voiceJdExtractService");
const {
  syncScreeningQuestionsIntoCallPrompt,
  applyScreeningQuestionCountToCallObjective,
  normalizeScreeningTemplateText,
} = require("./voiceAgentPromptService");
const { screeningGoalObjective } = require("../constants/screeningGoals");
const { VOICE_CALL_OBJECTIVE_DEFAULT } = require("../constants/outreachVoiceDefaults");
const {
  createOutreachModuleCampaign,
  updateOutreachModuleCampaign,
  launchOutreachModuleCampaign,
  pauseOutreachModuleCampaign,
  getOutreachModuleCampaignTracking,
  getOutreachModuleCandidateInteractions,
  recordOutreachModuleCandidateAction,
} = require("./outreachModuleCampaignService");

const CANDIDATE_SOURCE_MAP = {
  talent_pool: "talent_pool",
  csv: "csv",
  cvs: "cvs",
  ats: "ats",
  outreach_interested: "talent_pool",
  existing_pool: "talent_pool",
};

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

function userOid(userId) {
  return new mongoose.Types.ObjectId(String(userId));
}

async function accessFilterForActor(actorUserId) {
  const orgFilter = await userIdFilterForActor(actorUserId);
  if (orgFilter) return orgFilter;
  if (!mongoose.Types.ObjectId.isValid(String(actorUserId))) return null;
  return { userId: userOid(actorUserId) };
}

function formatCreatedDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function parseAttemptGapHours(value) {
  const s = String(value || "").trim().toLowerCase();
  const hourMatch = s.match(/(\d+)\s*hour/);
  if (hourMatch) return Math.max(1, parseInt(hourMatch[1], 10));
  const dayMatch = s.match(/(\d+)\s*day/);
  if (dayMatch) return Math.max(1, parseInt(dayMatch[1], 10)) * 24;
  const minMatch = s.match(/(\d+)\s*min/);
  if (minMatch) return Math.max(1, Math.ceil(parseInt(minMatch[1], 10) / 60));
  const n = parseInt(s, 10);
  if (Number.isFinite(n) && n > 0) return n;
  return 24;
}

function buildScreeningJobDescription(details = {}) {
  const lines = [];
  if (details.jobTitle) lines.push(`Role: ${details.jobTitle}`);
  if (details.companyName) lines.push(`Company: ${details.companyName}`);
  if (details.location) lines.push(`Location: ${details.location}`);
  if (details.experienceRequired) {
    lines.push(`Experience required: ${details.experienceRequired}`);
  }
  if (details.goal) lines.push(`Screening goal: ${details.goal}`);
  return lines.join("\n");
}

function resolveQuestionText(text, details = {}) {
  return normalizeScreeningTemplateText(text, details);
}

function buildCallObjective(details = {}) {
  const title = String(details.jobTitle || "").trim();
  if (!title) return VOICE_CALL_OBJECTIVE_DEFAULT;
  return screeningGoalObjective(details);
}

function buildCallPrompt(script = {}, questions = [], details = {}) {
  const questionTexts = (Array.isArray(questions) ? questions : [])
    .map((q) => resolveQuestionText(q?.text || q, details))
    .filter(Boolean);

  const base = [
    normalizeScreeningTemplateText(script.opening, details),
    "",
    normalizeScreeningTemplateText(script.jobIntro, details),
    "",
    "## Screening questions",
    "{jd_screening_questions_list}",
    "",
    "## Call flow",
    "{jd_screening_call_flow_steps}",
    "",
    normalizeScreeningTemplateText(script.closing, details),
  ]
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n");

  return syncScreeningQuestionsIntoCallPrompt(base, questionTexts, { storageForm: true });
}

function countCompletedCandidates(candidates = []) {
  let completed = 0;
  let shortlisted = 0;
  for (const c of candidates) {
    const status = String(c.responseStatus || "");
    if (["call_completed", "interested", "not_interested", "replied"].includes(status)) {
      completed += 1;
    }
    if (status === "interested") shortlisted += 1;
  }
  return { completed, shortlisted };
}

function formatScreeningRow(doc) {
  const candidates = Array.isArray(doc.candidates) ? doc.candidates : [];
  const { completed, shortlisted } = countCompletedCandidates(candidates);
  return {
    id: String(doc._id),
    name: doc.name || "",
    type: doc.screeningType === "video" ? "video" : "voice",
    candidates: candidates.length,
    completed,
    shortlisted,
    status: doc.status || "draft",
    createdDate: formatCreatedDate(doc.createdAt),
  };
}

function mapRecommendation(callResult) {
  const text = [
    callResult?.finalOutcome,
    callResult?.interestLevel,
    callResult?.candidateStatus,
  ]
    .map((v) => String(v || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");

  if (!text) return null;
  if (text.includes("not interested") || text.includes("wrong person")) {
    return "not_recommended";
  }
  if (text.includes("interested") || text.includes("confirmed")) {
    return "good_fit";
  }
  if (text.includes("callback")) return "needs_review";
  return "needs_review";
}

function mapCandidateScreeningStatus(responseStatus) {
  switch (String(responseStatus || "")) {
    case "interested":
      return "shortlisted";
    case "not_interested":
      return "rejected";
    case "call_completed":
      return "completed";
    case "failed_delivery":
      return "call_failed";
    case "no_response":
      return "no_response";
    default:
      return "pending";
  }
}

function latestVoiceInteraction(candidate) {
  const interactions = Array.isArray(candidate?.interactions) ? candidate.interactions : [];
  for (let i = interactions.length - 1; i >= 0; i -= 1) {
    if (interactions[i]?.type === "voice") return interactions[i];
  }
  return null;
}

function normalizeResultValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean).join(", ");
  }
  if (value && typeof value === "object") return "";
  return String(value ?? "").trim();
}

function rawHunarResult(voiceCall) {
  const result = voiceCall?.resultPayload?.result;
  return result && typeof result === "object" && !Array.isArray(result) ? result : {};
}

const RESULT_DETAIL_FIELDS = [
  ["Final outcome", "final_outcome"],
  ["Interest level", "interest_level"],
  ["Candidate status", "candidate_status"],
  ["Experience", "experience"],
  ["Relevant experience", "relevant_experience"],
  ["Skills and tools", "skills_and_tools"],
  ["Recent project", "recent_project"],
  ["Current CTC", "ctc"],
  ["Expected CTC", "expected_ctc"],
  ["Notice period", "notice_period"],
  ["Location", "location"],
  ["Education", "education"],
  ["Callback requested", "callback_requested"],
  ["Callback time", "callback_time"],
  ["Candidate questions", "candidate_questions"],
];

function buildResultDetails(callResult = {}) {
  return RESULT_DETAIL_FIELDS
    .map(([label, key]) => ({ label, value: normalizeResultValue(callResult[key]) }))
    .filter((entry) => entry.value);
}

function normalizeTranscript(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") {
          const match = entry.match(/^\s*([^:]{1,30}):\s*(.+)$/);
          return {
            speaker: match ? match[1].trim() : "Speaker",
            text: match ? match[2].trim() : entry.trim(),
          };
        }
        if (!entry || typeof entry !== "object") return null;
        const speaker = String(
          entry.speaker || entry.role || entry.participant || entry.author || "Speaker"
        ).trim();
        const text = String(
          entry.text || entry.content || entry.message || entry.transcript || ""
        ).trim();
        return text ? { speaker, text } : null;
      })
      .filter(Boolean);
  }

  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([^:]{1,30}):\s*(.+)$/);
      return {
        speaker: match ? match[1].trim() : "Speaker",
        text: match ? match[2].trim() : line,
      };
    });
}

function extractTranscript(voiceCall) {
  const rawResult = rawHunarResult(voiceCall);
  const candidates = [
    rawResult.transcript,
    rawResult.call_transcript,
    rawResult.conversation,
    voiceCall?.resultPayload?.transcript,
    voiceCall?.resultPayload?.call_transcript,
    voiceCall?.summaryPayload?.transcript,
    voiceCall?.summaryPayload?.call_transcript,
    voiceCall?.summaryPayload?.result?.transcript,
  ];
  for (const candidate of candidates) {
    const lines = normalizeTranscript(candidate);
    if (lines.length > 0) return lines;
  }
  return [];
}

function buildScorecard(rawResult = {}) {
  const source = rawResult.scorecard || rawResult.scores || rawResult.evaluation_scores;
  const entries = [];

  if (Array.isArray(source)) {
    for (const item of source) {
      if (!item || typeof item !== "object") continue;
      const label = String(item.label || item.name || item.criterion || "").trim();
      const score = Number(item.score ?? item.value);
      if (label && Number.isFinite(score)) {
        entries.push({ label, score: Math.max(0, Math.min(100, score)) });
      }
    }
  } else if (source && typeof source === "object") {
    for (const [key, value] of Object.entries(source)) {
      const score = Number(value?.score ?? value);
      if (Number.isFinite(score)) {
        entries.push({
          label: key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
          score: Math.max(0, Math.min(100, score)),
        });
      }
    }
  }

  const explicitOverall = Number(
    rawResult.overall_score ?? rawResult.smart_score ?? rawResult.score
  );
  const overallScore = Number.isFinite(explicitOverall)
    ? Math.max(0, Math.min(100, explicitOverall))
    : entries.length > 0
      ? Math.round(entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length)
      : null;

  return { entries, overallScore };
}

function formatScreeningResultRow(candidate, screeningType = "voice") {
  const voice = latestVoiceInteraction(candidate);
  const callResult =
    voice?.content?.callResult && typeof voice.content.callResult === "object"
      ? voice.content.callResult
      : {};

  const completedAt = voice?.at ? formatCreatedDate(voice.at) : "—";
  const summary = String(callResult.summary || candidate.lastResponse || "").trim();

  return {
    id: String(candidate._id || candidate.id),
    name: candidate.name || "",
    role: candidate.role || "",
    type: screeningType === "video" ? "video" : "voice",
    status: mapCandidateScreeningStatus(candidate.responseStatus),
    score: null,
    recommendation: mapRecommendation(callResult),
    keyStrength:
      String(callResult.skills_and_tools || callResult.relevant_experience || "").trim() ||
      (candidate.interest && candidate.interest !== "-" ? candidate.interest : "—"),
    concern:
      Array.isArray(callResult.objectionsOrConcerns) && callResult.objectionsOrConcerns.length > 0
        ? String(callResult.objectionsOrConcerns[0])
        : candidate.responseStatus === "not_interested"
          ? "Not interested"
          : "—",
    completedAt,
    aiSummary: summary || "—",
    callResult,
  };
}

function buildScreeningDetailStats(candidates = []) {
  const total = candidates.length;
  let invited = 0;
  let completed = 0;
  let shortlisted = 0;
  let rejected = 0;
  let pending = 0;

  for (const c of candidates) {
    const status = String(c.responseStatus || "");
    if (status !== "no_response") invited += 1;
    if (["call_completed", "interested", "not_interested", "replied"].includes(status)) {
      completed += 1;
    }
    if (status === "interested") shortlisted += 1;
    if (status === "not_interested") rejected += 1;
    if (status === "no_response" || !status) pending += 1;
  }

  return {
    total,
    invited,
    completed,
    shortlisted,
    rejected,
    pending,
    avgScore: "—",
  };
}

function buildScreeningFunnel(candidates = []) {
  const total = candidates.length;
  let called = 0;
  let completed = 0;
  let shortlisted = 0;

  for (const c of candidates) {
    const status = String(c.responseStatus || "");
    if (status !== "no_response") called += 1;
    if (["call_completed", "interested", "not_interested", "replied"].includes(status)) {
      completed += 1;
    }
    if (status === "interested") shortlisted += 1;
  }

  return [
    { label: "Added", count: total },
    { label: "Called", count: called },
    { label: "Completed", count: completed },
    { label: "Shortlisted", count: shortlisted },
  ];
}

function formatScreeningResultDetail(candidate, screeningType = "voice", voiceCall = null) {
  const row = formatScreeningResultRow(candidate, screeningType);
  const storedResult = rawHunarResult(voiceCall);
  const callResult = {
    ...(row.callResult || {}),
    ...storedResult,
  };
  const score = buildScorecard(storedResult);
  const fallbackSummary = row.aiSummary === "—" ? "" : row.aiSummary;
  const insights = [];
  if (callResult.experience) insights.push(`Experience: ${callResult.experience}`);
  if (callResult.relevant_experience) {
    insights.push(`Relevant experience: ${callResult.relevant_experience}`);
  }
  if (callResult.skills_and_tools) insights.push(`Skills: ${callResult.skills_and_tools}`);
  if (callResult.location) insights.push(`Location: ${callResult.location}`);
  if (callResult.notice_period) insights.push(`Notice period: ${callResult.notice_period}`);

  const concerns = [];
  if (Array.isArray(callResult.objectionsOrConcerns)) {
    concerns.push(...callResult.objectionsOrConcerns.filter(Boolean));
  }
  if (row.status === "rejected") concerns.push("Marked not interested on call");

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    location: candidate.location || "—",
    experience: candidate.experience || callResult.experience || "—",
    overallScore: score.overallScore,
    recommendation: mapRecommendation({
      finalOutcome: callResult.finalOutcome || callResult.final_outcome,
      interestLevel: callResult.interestLevel || callResult.interest_level,
      candidateStatus: callResult.candidateStatus || callResult.candidate_status,
    }) || row.recommendation || "needs_review",
    aiSummary:
      String(
        callResult.summary ||
          voiceCall?.summaryText ||
          fallbackSummary ||
          ""
      ).trim() || "No AI summary is available yet.",
    scorecard: score.entries,
    resultDetails: buildResultDetails(storedResult),
    transcript: extractTranscript(voiceCall),
    recordingUrl: String(voiceCall?.recordingUrl || "").trim(),
    insights: insights.length > 0 ? insights : ["Awaiting call results"],
    concerns: concerns.length > 0 ? concerns : ["None noted"],
    type: screeningType === "video" ? "video" : "voice",
  };
}

async function findScreeningInScope(actorUserId, screeningId) {
  const access = await accessFilterForActor(actorUserId);
  if (!access) throw badRequest("Invalid session");

  if (!mongoose.Types.ObjectId.isValid(String(screeningId))) {
    throw badRequest("Invalid screening id");
  }

  const doc = await OutreachModuleCampaign.findOne({
    ...access,
    _id: screeningId,
    sourceModule: "screening",
  }).lean();

  if (!doc) throw notFound("Screening not found");
  return doc;
}

async function getScreeningDashboardStats(actorUserId) {
  const access = await accessFilterForActor(actorUserId);
  if (!access) throw badRequest("Invalid session");

  const docs = await OutreachModuleCampaign.find({
    ...access,
    sourceModule: "screening",
  })
    .select("candidates status")
    .lean();

  let completed = 0;
  let shortlisted = 0;
  for (const doc of docs) {
    const counts = countCompletedCandidates(doc.candidates || []);
    completed += counts.completed;
    shortlisted += counts.shortlisted;
  }

  return {
    stats: {
      totalScreenings: docs.length,
      completed,
      shortlisted,
      avgScore: "—",
    },
  };
}

async function listScreenings(actorUserId, options = {}) {
  const access = await accessFilterForActor(actorUserId);
  if (!access) throw badRequest("Invalid session");

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 20));

  const filter = { ...access, sourceModule: "screening" };
  const status = String(options.status || "").trim();
  if (status) filter.status = status;

  const total = await OutreachModuleCampaign.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const effectivePage = Math.min(page, totalPages);
  const skip = (effectivePage - 1) * limit;

  const docs = await OutreachModuleCampaign.find(filter)
    .sort({ updatedAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    screenings: docs.map(formatScreeningRow),
    pagination: {
      page: effectivePage,
      limit,
      total,
      totalPages,
    },
  };
}

async function getScreeningDetail(actorUserId, screeningId) {
  await findScreeningInScope(actorUserId, screeningId);
  const tracking = await getOutreachModuleCampaignTracking(actorUserId, screeningId);

  const access = await accessFilterForActor(actorUserId);
  const doc = await OutreachModuleCampaign.findOne({
    ...access,
    _id: screeningId,
    sourceModule: "screening",
  }).lean();

  if (!doc) throw notFound("Screening not found");

  const screeningType = doc.screeningType === "video" ? "video" : "voice";
  const rawCandidates = Array.isArray(doc.candidates) ? doc.candidates : [];
  const results = rawCandidates.map((c) => formatScreeningResultRow(c, screeningType));

  return {
    screening: formatScreeningRow(doc),
    stats: buildScreeningDetailStats(rawCandidates),
    funnel: buildScreeningFunnel(rawCandidates),
    results,
    tracking,
  };
}

async function getScreeningCandidateDetail(actorUserId, screeningId, candidateId) {
  const doc = await findScreeningInScope(actorUserId, screeningId);
  const candidate = (doc.candidates || []).find((c) => String(c._id) === String(candidateId));
  if (!candidate) throw notFound("Candidate not found");

  const screeningType = doc.screeningType === "video" ? "video" : "voice";
  const candidateKey = String(candidate.candidateRefId || "").trim();
  const [interactions, voiceCall] = await Promise.all([
    getOutreachModuleCandidateInteractions(actorUserId, screeningId, candidateId),
    candidateKey
      ? CampaignVoiceCall.findOne({
          campaignId: screeningId,
          candidateKey,
        })
          .sort({ lastEventAt: -1, updatedAt: -1 })
          .lean()
      : Promise.resolve(null),
  ]);

  return {
    detail: formatScreeningResultDetail(candidate, screeningType, voiceCall),
    interactions: interactions.interactions || [],
    candidate: interactions.candidate,
  };
}

async function getScreeningResultVariables(actorUserId, screeningId) {
  const doc = await findScreeningInScope(actorUserId, screeningId);
  const screeningType = doc.screeningType === "video" ? "video" : "voice";
  const candidates = Array.isArray(doc.candidates) ? doc.candidates : [];

  const voiceCalls = await CampaignVoiceCall.find({ campaignId: screeningId })
    .sort({ lastEventAt: 1, updatedAt: 1 })
    .lean();
  const callByCandidateKey = new Map();
  for (const call of voiceCalls) {
    const key = String(call.candidateKey || "").trim();
    if (key) callByCandidateKey.set(key, call);
  }

  const rows = candidates.map((candidate) => {
    const row = formatScreeningResultRow(candidate, screeningType);
    const candidateKey = String(candidate.candidateRefId || "").trim();
    const voiceCall = candidateKey ? callByCandidateKey.get(candidateKey) : null;
    const storedResult = rawHunarResult(voiceCall);
    const callResult = { ...(row.callResult || {}), ...storedResult };

    const variables = { Summary: normalizeResultValue(callResult.summary) };
    for (const [label, key] of RESULT_DETAIL_FIELDS) {
      variables[label] = normalizeResultValue(callResult[key]);
    }

    return {
      id: row.id,
      name: row.name,
      role: row.role,
      status: row.status,
      variables,
    };
  });

  const allColumns = ["Summary", ...RESULT_DETAIL_FIELDS.map(([label]) => label)];
  const columns = allColumns.filter((label) =>
    rows.some((row) => row.variables[label])
  );

  return {
    screening: formatScreeningRow(doc),
    columns,
    rows,
  };
}

function normalizeCreatePayload(payload = {}) {
  const details = payload.details || payload.form || {};
  const jobDescription =
    String(payload.jobDescription || details.jobDescription || "").trim() ||
    buildScreeningJobDescription(details);

  if (!jobDescription) {
    throw badRequest("Job description is required");
  }

  const jdExtract = fallbackJdExtract(
    jobDescription,
    String(details.jobTitle || payload.jobTitle || "").trim()
  );

  const jobTitle =
    String(details.jobTitle || payload.jobTitle || "").trim() ||
    String(jdExtract.role || "").trim() ||
    "Open role";
  const name =
    String(details.name || payload.name || "").trim() || `${jobTitle} screening`;

  const enrichedDetails = {
    ...details,
    name,
    jobTitle,
    companyName:
      String(details.companyName || "").trim() || String(jdExtract.company || "").trim(),
    location: String(details.location || "").trim(),
    experienceRequired:
      String(details.experienceRequired || "").trim() ||
      String(jdExtract.experience || "").trim(),
    goal: String(details.goal || "interest").trim(),
    jobDescription,
  };

  const candidateIds = Array.isArray(payload.candidateIds)
    ? payload.candidateIds
    : Array.isArray(payload.selectedIds)
      ? payload.selectedIds
      : [];
  if (candidateIds.length === 0) {
    throw badRequest("At least one candidate must be selected");
  }

  const rawSource = String(payload.candidateSource || payload.source || "talent_pool").trim();
  const candidateSource = CANDIDATE_SOURCE_MAP[rawSource] || "talent_pool";

  const script = payload.script || {};
  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  const callPrompt = buildCallPrompt(script, questions, enrichedDetails);
  if (!callPrompt.trim()) {
    throw badRequest("Add a voice call script or screening questions before launching");
  }

  const questionCount = questions.filter((q) => String(q?.text || q || "").trim()).length;
  let callObjective = buildCallObjective(enrichedDetails);
  if (questionCount > 0) {
    callObjective = applyScreeningQuestionCountToCallObjective(callObjective, questionCount);
  }

  const attempts = Math.max(1, Number(payload.attempts ?? payload.callAttempts) || 1);
  const attemptGapHours = parseAttemptGapHours(
    payload.attemptGapHours ?? payload.attemptGap ?? "24 hours"
  );

  return {
    name,
    jobTitle,
    jobDescription,
    goal: "screening",
    mode: "single",
    channel: "voice",
    status: payload.launch === false ? "draft" : "draft",
    candidateSource,
    candidateIds: candidateIds.map((id) => String(id).trim()).filter(Boolean),
    aiPersonalize: false,
    launch: false,
    sourceModule: "screening",
    screeningType: payload.screeningType === "video" ? "video" : "voice",
    screeningConfig: {
      companyName: enrichedDetails.companyName,
      location: enrichedDetails.location,
      experienceRequired: enrichedDetails.experienceRequired,
      goal: enrichedDetails.goal,
      language: String(payload.language || "english").trim(),
      voiceTone: payload.voiceTone || "professional",
      attempts,
      attemptGapHours,
      durationLimit: String(payload.durationLimit || "").trim(),
      autoFollowUp: payload.autoFollowUp !== false,
      consentMessage: payload.consentMessage !== false,
      script,
      questions,
    },
    channelMessage: {
      channel: "voice",
      body: callPrompt,
      callObjective,
      voiceTone: payload.voiceTone || "professional",
      callAttempts: attempts,
      attemptGapHours,
    },
  };
}

async function createVoiceScreening(actorUserId, payload = {}) {
  if (payload.screeningType === "video") {
    throw badRequest("Video screening is not available yet");
  }

  const normalized = normalizeCreatePayload(payload);
  const shouldLaunch = payload.launch !== false;

  const { campaign, row } = await createOutreachModuleCampaign(actorUserId, normalized);

  if (shouldLaunch) {
    await launchOutreachModuleCampaign(actorUserId, campaign.id);
    const refreshed = await findScreeningInScope(actorUserId, campaign.id);
    return {
      screening: formatScreeningRow(refreshed),
      row,
      launched: true,
    };
  }

  return {
    screening: formatScreeningRow(
      await findScreeningInScope(actorUserId, campaign.id)
    ),
    row,
    launched: false,
  };
}

function attemptGapHoursToLabel(hours) {
  const h = Math.max(1, Number(hours) || 24);
  if (h % 24 === 0) {
    const days = h / 24;
    return days === 1 ? "1 day" : `${days} days`;
  }
  return h === 1 ? "1 hour" : `${h} hours`;
}

/** Builder state for resuming a draft screening in the frontend wizard. */
async function getScreeningDraft(actorUserId, screeningId) {
  const doc = await findScreeningInScope(actorUserId, screeningId);
  const config = doc.screeningConfig || {};
  const candidates = Array.isArray(doc.candidates) ? doc.candidates : [];

  return {
    screening: formatScreeningRow(doc),
    draft: {
      details: {
        name: doc.name || "",
        jobTitle: doc.jobTitle || "",
        companyName: String(config.companyName || ""),
        location: String(config.location || ""),
        experienceRequired: String(config.experienceRequired || ""),
        goal: String(config.goal || "interest"),
        jobDescription: doc.jobDescription || "",
      },
      candidateIds: candidates
        .map((c) => String(c.candidateRefId || "").trim())
        .filter(Boolean),
      candidateSource: doc.candidateSource || "talent_pool",
      language: String(config.language || "english"),
      voiceTone: String(config.voiceTone || "professional"),
      attempts: Math.max(1, Number(config.attempts) || 1),
      attemptGap: attemptGapHoursToLabel(config.attemptGapHours),
      durationLimit: String(config.durationLimit || "5 minutes"),
      script: config.script || {},
      questions: Array.isArray(config.questions) ? config.questions : [],
    },
  };
}

/** Update a draft screening in place (and optionally launch it). */
async function updateVoiceScreening(actorUserId, screeningId, payload = {}) {
  if (payload.screeningType === "video") {
    throw badRequest("Video screening is not available yet");
  }

  const existing = await findScreeningInScope(actorUserId, screeningId);
  if (existing.status !== "draft") {
    throw badRequest("Only draft screenings can be edited");
  }

  const normalized = normalizeCreatePayload(payload);
  const shouldLaunch = payload.launch !== false;

  await updateOutreachModuleCampaign(actorUserId, screeningId, {
    name: normalized.name,
    jobTitle: normalized.jobTitle,
    jobDescription: normalized.jobDescription,
    candidateSource: normalized.candidateSource,
    channel: "voice",
    channelMessage: normalized.channelMessage,
    candidateIds: normalized.candidateIds,
  });

  // screeningConfig is not part of the generic campaign update path.
  await OutreachModuleCampaign.updateOne(
    { _id: screeningId },
    { $set: { screeningConfig: normalized.screeningConfig } }
  );

  if (shouldLaunch) {
    await launchOutreachModuleCampaign(actorUserId, screeningId);
  }

  const refreshed = await findScreeningInScope(actorUserId, screeningId);
  return {
    screening: formatScreeningRow(refreshed),
    launched: shouldLaunch,
  };
}

async function launchScreening(actorUserId, screeningId) {
  await findScreeningInScope(actorUserId, screeningId);
  const result = await launchOutreachModuleCampaign(actorUserId, screeningId);
  const doc = await findScreeningInScope(actorUserId, screeningId);
  return {
    screening: formatScreeningRow(doc),
    launch: result.launch,
  };
}

async function pauseScreening(actorUserId, screeningId) {
  await findScreeningInScope(actorUserId, screeningId);
  const result = await pauseOutreachModuleCampaign(actorUserId, screeningId);
  return { screening: formatScreeningRow(await findScreeningInScope(actorUserId, screeningId)) };
}

async function recordScreeningCandidateAction(actorUserId, screeningId, candidateId, payload) {
  await findScreeningInScope(actorUserId, screeningId);
  const actionMap = {
    shortlist: "screening",
    schedule_interview: "interview",
    reject: "not_interested",
    add_note: "note",
  };
  const action = actionMap[String(payload.action || "").trim()];
  if (!action) throw badRequest("Invalid action");

  return recordOutreachModuleCandidateAction(actorUserId, screeningId, candidateId, {
    action,
    note: payload.note,
  });
}

async function generateScreeningQuestions(actorUserId, payload = {}) {
  const details = payload.details || payload.form || payload;
  const jobDescription =
    String(payload.jobDescription || details.jobDescription || "").trim() ||
    buildScreeningJobDescription(details);

  if (!jobDescription) {
    throw badRequest("Job description is required to generate questions");
  }

  const jobTitle = String(details.jobTitle || payload.jobTitle || "").trim();
  const jdExtract = await extractVoiceJdDetailsFromGemini(jobDescription, jobTitle);
  const resolvedJobTitle = jobTitle || String(jdExtract.role || "").trim();
  const enrichedDetails = {
    ...details,
    jobTitle: resolvedJobTitle,
    companyName:
      String(details.companyName || "").trim() || String(jdExtract.company || "").trim(),
    location: String(details.location || "").trim(),
    experienceRequired:
      String(details.experienceRequired || "").trim() ||
      String(jdExtract.experience || "").trim(),
    jobDescription,
  };
  const screeningQuestions = Array.isArray(jdExtract.screeningQuestions)
    ? jdExtract.screeningQuestions
    : [];

  const questions = screeningQuestions.map((text, index) => ({
    id: `gq${index + 1}`,
    text: resolveQuestionText(text, enrichedDetails),
    weight: 10,
    required: true,
  }));

  const roleBrief = String(jdExtract.roleBrief || "").trim();
  const script = {
    opening: "Hello, am I speaking with {callee_name}?",
    jobIntro:
      roleBrief ||
      `I'm calling regarding the ${resolvedJobTitle || "open"} role${
        enrichedDetails.companyName ? ` at ${enrichedDetails.companyName}` : ""
      }.`,
    closing:
      "Thank you for your time today. Our team will review your responses and get back to you with next steps.",
  };

  return { questions, script, jdExtract };
}

module.exports = {
  getScreeningDashboardStats,
  listScreenings,
  getScreeningDetail,
  getScreeningCandidateDetail,
  getScreeningResultVariables,
  getScreeningDraft,
  createVoiceScreening,
  updateVoiceScreening,
  launchScreening,
  pauseScreening,
  recordScreeningCandidateAction,
  generateScreeningQuestions,
};
