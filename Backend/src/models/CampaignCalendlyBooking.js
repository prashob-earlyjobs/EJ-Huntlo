const mongoose = require("mongoose");

const campaignCalendlyBookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    outreachModuleCampaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutreachModuleCampaign",
      index: true,
    },
    scheduleCandidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduleCandidate",
      index: true,
    },
    candidateId: { type: String, default: "", trim: true },
    candidateRefId: { type: String, default: "", trim: true },
    calendlyEventUri: { type: String, required: true, trim: true },
    calendlyInviteeUri: { type: String, required: true, trim: true, unique: true },
    eventTypeUri: { type: String, default: "", trim: true },
    eventName: { type: String, default: "", trim: true },
    inviteeEmail: { type: String, default: "", trim: true, lowercase: true },
    inviteeName: { type: String, default: "", trim: true },
    hostName: { type: String, default: "", trim: true },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, default: null },
    status: {
      type: String,
      enum: ["active", "canceled"],
      default: "active",
      index: true,
    },
    rescheduleUrl: { type: String, default: "", trim: true },
    cancelUrl: { type: String, default: "", trim: true },
    timezone: { type: String, default: "", trim: true },
    locationLabel: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

campaignCalendlyBookingSchema.index({ outreachModuleCampaignId: 1, startTime: -1 });
campaignCalendlyBookingSchema.index({ outreachModuleCampaignId: 1, inviteeEmail: 1 });
campaignCalendlyBookingSchema.index({ userId: 1, startTime: -1 });
campaignCalendlyBookingSchema.index({ scheduleCandidateId: 1, startTime: -1 });

module.exports = mongoose.model("CampaignCalendlyBooking", campaignCalendlyBookingSchema);
