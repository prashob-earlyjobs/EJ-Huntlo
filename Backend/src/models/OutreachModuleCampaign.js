const mongoose = require("mongoose");

const outreachModuleInteractionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["whatsapp", "email", "voice", "note", "action"],
      default: "note",
    },
    summary: { type: String, default: "", trim: true },
    content: { type: mongoose.Schema.Types.Mixed, default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const outreachModuleCandidateSchema = new mongoose.Schema(
  {
    candidateRefId: { type: String, default: "", trim: true },
    name: { type: String, default: "", trim: true },
    role: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    experience: { type: String, default: "", trim: true },
    matchScore: { type: Number, default: 0 },
    poolStatus: { type: String, default: "", trim: true },
    channel: { type: String, default: "", trim: true },
    lastStep: { type: String, default: "", trim: true },
    responseStatus: {
      type: String,
      enum: [
        "interested",
        "not_interested",
        "no_response",
        "replied",
        "follow_up_scheduled",
        "interview_scheduled",
        "call_completed",
        "failed_delivery",
      ],
      default: "no_response",
    },
    interest: { type: String, default: "-", trim: true },
    lastResponse: { type: String, default: "-", trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    nextAction: { type: String, default: "", trim: true },
    interactions: { type: [outreachModuleInteractionSchema], default: [] },
  },
  { _id: true }
);

const outreachModuleSequenceStepSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["whatsapp", "email", "voice", "linkedin"],
      required: true,
    },
    label: { type: String, default: "", trim: true },
    delayValue: { type: Number, default: 0, min: 0 },
    delayUnit: { type: String, enum: ["minutes", "hours", "days"], default: "days" },
    condition: {
      type: String,
      enum: [
        "all",
        "no_response",
        "not_opened",
        "not_interested",
        "whatsapp_not_delivered",
      ],
      default: "all",
    },
    timingLabel: { type: String, default: "", trim: true },
    message: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: true }
);

const outreachModuleChannelMessageSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["whatsapp", "email", "voice", "linkedin"],
      default: "whatsapp",
    },
    templateId: { type: String, default: "", trim: true },
    followUpTemplateId: { type: String, default: "", trim: true },
    followUpBody: { type: String, default: "" },
    followUpWaitHours: { type: Number, default: 48, min: 1 },
    followUp2TemplateId: { type: String, default: "", trim: true },
    followUp2Body: { type: String, default: "" },
    followUp2WaitHours: { type: Number, default: 96, min: 1 },
    replyQuestions: { type: [String], default: [] },
    replyBody: { type: String, default: "" },
    subject: { type: String, default: "", trim: true },
    body: { type: String, default: "" },
    emailTouchpoints: {
      type: [
        {
          order: { type: Number, default: 1, min: 1 },
          label: { type: String, default: "", trim: true },
          subject: { type: String, default: "", trim: true },
          body: { type: String, default: "" },
          waitDays: { type: Number, default: 0, min: 0 },
          waitHours: { type: Number, default: 0, min: 0 },
          waitMinutes: { type: Number, default: 0, min: 0 },
          waitUnit: {
            type: String,
            enum: ["minutes", "hours", "days"],
            default: "days",
          },
        },
      ],
      default: [],
    },
    callObjective: { type: String, default: "", trim: true },
    voiceTone: {
      type: String,
      enum: ["professional", "friendly", "direct"],
      default: "professional",
    },
    callAttempts: { type: Number, default: 1, min: 1 },
    attemptGapHours: { type: Number, default: 24, min: 0 },
  },
  { _id: false }
);

const outreachModuleStatsSchema = new mongoose.Schema(
  {
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    replied: { type: Number, default: 0 },
    interested: { type: Number, default: 0 },
    notInterested: { type: Number, default: 0 },
    noResponse: { type: Number, default: 0 },
  },
  { _id: false }
);

const outreachModuleFunnelStageSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    count: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const outreachModuleCalendlyAutomationSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    meetingUri: { type: String, trim: true, default: "" },
    meetingName: { type: String, trim: true, default: "" },
    schedulingUrl: { type: String, trim: true, default: "" },
    durationMinutes: { type: Number, default: 0, min: 0 },
    kind: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const outreachModulePostQualificationVoiceSchema = new mongoose.Schema(
  {
    callObjective: { type: String, default: "", trim: true },
    body: { type: String, default: "" },
    voiceTone: {
      type: String,
      enum: ["professional", "friendly", "direct"],
      default: "professional",
    },
    callAttempts: { type: Number, default: 1, min: 1 },
    attemptGapHours: { type: Number, default: 24, min: 0 },
  },
  { _id: false }
);

const outreachModulePostQualificationSchema = new mongoose.Schema(
  {
    screeningEnabled: { type: Boolean, default: false },
    schedulingEnabled: { type: Boolean, default: false },
    voice: {
      type: outreachModulePostQualificationVoiceSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);

const outreachModuleBuilderDetailsSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    jobTitle: { type: String, default: "", trim: true },
    jobDescription: { type: String, default: "" },
    goal: {
      type: String,
      enum: ["interest", "screening", "job_opportunity", "follow_up"],
      default: "interest",
    },
  },
  { _id: false }
);

const outreachModuleBuilderChannelSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["whatsapp", "email", "voice", "linkedin", ""],
      default: "",
    },
  },
  { _id: false }
);

const outreachModuleBuilderMessageSchema = new mongoose.Schema(
  {
    aiPersonalize: { type: Boolean, default: true },
    channelMessage: {
      type: outreachModuleChannelMessageSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);

const outreachModuleBuilderSequenceSchema = new mongoose.Schema(
  {
    steps: { type: [outreachModuleSequenceStepSchema], default: [] },
  },
  { _id: false }
);

const outreachModuleBuilderPersonalizeMessageSchema = new mongoose.Schema(
  {
    stepId: { type: String, default: "", trim: true },
    message: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const outreachModuleBuilderPersonalizeSchema = new mongoose.Schema(
  {
    aiPersonalize: { type: Boolean, default: true },
    stepMessages: {
      type: [outreachModuleBuilderPersonalizeMessageSchema],
      default: [],
    },
    whatsappReplyQuestions: { type: [String], default: [] },
  },
  { _id: false }
);

const outreachModuleBuilderCandidatesSchema = new mongoose.Schema(
  {
    candidateSource: {
      type: String,
      enum: ["talent_pool", "csv", "cvs", "ats"],
      default: "talent_pool",
    },
    candidateIds: { type: [String], default: [] },
  },
  { _id: false }
);

/** Wizard progress — one nested object per builder step (review step is UI-only). */
const outreachModuleBuilderSchema = new mongoose.Schema(
  {
    currentStep: { type: Number, default: 0, min: 0, max: 4 },
    completedSteps: { type: [String], default: [] },
    details: { type: outreachModuleBuilderDetailsSchema, default: () => ({}) },
    channel: { type: outreachModuleBuilderChannelSchema, default: () => ({}) },
    message: { type: outreachModuleBuilderMessageSchema, default: () => ({}) },
    sequence: { type: outreachModuleBuilderSequenceSchema, default: () => ({}) },
    personalize: { type: outreachModuleBuilderPersonalizeSchema, default: () => ({}) },
    candidates: { type: outreachModuleBuilderCandidatesSchema, default: () => ({}) },
  },
  { _id: false }
);

const outreachModuleCampaignSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    jobTitle: { type: String, default: "", trim: true },
    jobDescription: { type: String, default: "" },
    goal: {
      type: String,
      enum: ["interest", "screening", "job_opportunity", "follow_up"],
      default: "interest",
    },
    /** `outreach` (default), `screening`, or `huntlo360` (outreach + schedule unified flow). */
    sourceModule: {
      type: String,
      enum: ["outreach", "screening", "huntlo360"],
      default: "outreach",
      index: true,
    },
    screeningType: {
      type: String,
      enum: ["voice", "video", ""],
      default: "",
    },
    screeningConfig: { type: mongoose.Schema.Types.Mixed, default: null },
    voiceJdExtract: { type: mongoose.Schema.Types.Mixed, default: null },
    mode: {
      type: String,
      enum: ["single", "multi"],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "completed"],
      default: "draft",
      index: true,
    },
    candidateSource: {
      type: String,
      enum: ["talent_pool", "csv", "cvs", "ats"],
      default: "talent_pool",
    },
    aiPersonalize: { type: Boolean, default: true },
    channel: {
      type: String,
      enum: ["whatsapp", "email", "voice", "linkedin", ""],
      default: "",
    },
    channelMessage: {
      type: outreachModuleChannelMessageSchema,
      default: () => ({}),
    },
    sequenceSteps: {
      type: [outreachModuleSequenceStepSchema],
      default: [],
    },
    channelLabels: { type: [String], default: [] },
    candidates: {
      type: [outreachModuleCandidateSchema],
      default: [],
    },
    stats: {
      type: outreachModuleStatsSchema,
      default: () => ({}),
    },
    funnel: {
      type: [outreachModuleFunnelStageSchema],
      default: [],
    },
    responseRate: { type: String, default: "-" },
    launchedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    emailIntegrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserIntegration",
      default: null,
    },
    /** Gemini auto-reply when candidates reply to outreach emails. */
    emailAutoReplyEnabled: { type: Boolean, default: true },
    calendlyAutomation: {
      type: outreachModuleCalendlyAutomationSchema,
      default: () => ({ enabled: false }),
    },
    postQualification: {
      type: outreachModulePostQualificationSchema,
      default: () => ({ screeningEnabled: false, schedulingEnabled: false }),
    },
    hunarVoiceAgentId: { type: String, default: "", trim: true },
    hunarVoiceAgent: { type: mongoose.Schema.Types.Mixed, default: null },
    voiceAgentConfig: { type: mongoose.Schema.Types.Mixed, default: null },
    builder: {
      type: outreachModuleBuilderSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

outreachModuleCampaignSchema.index({ userId: 1, updatedAt: -1 });
outreachModuleCampaignSchema.index({ userId: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model("OutreachModuleCampaign", outreachModuleCampaignSchema);
