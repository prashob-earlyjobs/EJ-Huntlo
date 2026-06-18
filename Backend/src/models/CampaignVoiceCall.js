const mongoose = require("mongoose");

const voiceCallResultSchema = new mongoose.Schema(
  {
    summary: { type: String, default: "" },
    callbackTime: { type: String, default: "" },
    finalOutcome: { type: String, default: "" },
    interestLevel: { type: String, default: "" },
    candidateStatus: { type: String, default: "" },
    callbackRequested: { type: String, default: "" },
    candidateQuestions: { type: [String], default: [] },
    objectionsOrConcerns: { type: [String], default: [] },
  },
  { _id: false }
);

/** * Voice-call channel only — Hunar AI callback state per outbound call.
 * Stored separately from CampaignSequenceEnrollment (gmail/whatsapp) and
 * CampaignWhatsAppMessage. MongoDB collection: campaign_voice_calls.
 */
const campaignVoiceCallSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    callId: { type: String, required: true, trim: true },
    requestId: { type: String, trim: true, default: "" },
    agentId: { type: String, trim: true, default: "" },
    candidateKey: { type: String, trim: true, default: "", index: true },
    contactName: { type: String, trim: true, default: "" },
    toNumber: { type: String, trim: true, default: "" },
    fromPhoneNumber: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "" },
    lifecycleStatus: { type: String, trim: true, default: "" },
    answeredBy: { type: String, trim: true, default: "" },
    durationSeconds: { type: Number, default: null },
    durationMinutes: { type: Number, default: null },
    eventType: { type: String, trim: true, default: "" },
    timezone: { type: String, trim: true, default: "" },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 0 },
    createdAtHunar: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    statusPayload: { type: mongoose.Schema.Types.Mixed, default: null },
    resultPayload: { type: mongoose.Schema.Types.Mixed, default: null },
    callResult: { type: voiceCallResultSchema, default: null },
    recordingUrl: { type: String, trim: true, default: "" },    recordingPayload: { type: mongoose.Schema.Types.Mixed, default: null },
    summaryText: { type: String, default: "" },
    summaryPayload: { type: mongoose.Schema.Types.Mixed, default: null },
    lastEventAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "campaign_voice_calls" }
);

campaignVoiceCallSchema.index({ campaignId: 1, callId: 1 }, { unique: true });
campaignVoiceCallSchema.index({ campaignId: 1, candidateKey: 1 });
campaignVoiceCallSchema.index({ campaignId: 1, lastEventAt: -1 });

module.exports = mongoose.model("CampaignVoiceCall", campaignVoiceCallSchema);