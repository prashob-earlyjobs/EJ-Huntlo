const mongoose = require("mongoose");

const campaignOutreachReplySchema = new mongoose.Schema(
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
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CampaignSequenceEnrollment",
      required: true,
      index: true,
    },
    candidateKey: { type: String, required: true, trim: true },
    gmailThreadId: { type: String, required: true, trim: true },
    gmailMessageId: { type: String, required: true, trim: true },
    rfcMessageId: { type: String, default: "", trim: true },
    fromEmail: { type: String, default: "", trim: true },
    toEmail: { type: String, default: "", trim: true },
    subject: { type: String, default: "" },
    snippet: { type: String, default: "" },
    bodyText: { type: String, default: "" },
    bodyHtml: { type: String, default: "" },
    receivedAt: { type: Date, required: true, index: true },
    isFromCandidate: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

campaignOutreachReplySchema.index(
  { userId: 1, gmailMessageId: 1 },
  { unique: true }
);
campaignOutreachReplySchema.index({ campaignId: 1, receivedAt: -1 });
campaignOutreachReplySchema.index({ enrollmentId: 1, receivedAt: -1 });

module.exports = mongoose.model("CampaignOutreachReply", campaignOutreachReplySchema);
