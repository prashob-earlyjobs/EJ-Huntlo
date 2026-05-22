const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    profilePhotoUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 512,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    credits: {
      type: Number,
      default: 0,
      min: 0,
    },
    planId: {
      type: String,
      default: "trial",
      trim: true,
      maxlength: 40,
    },
    usageCandidateSearches: { type: Number, default: 0, min: 0 },
    usageEmailUnveils: { type: Number, default: 0, min: 0 },
    usageCandidateUnveils: { type: Number, default: 0, min: 0 },
    usageMobileUnveils: { type: Number, default: 0, min: 0 },
    usageLinkedinLookups: { type: Number, default: 0, min: 0 },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    onboardingCompanyType: {
      type: String,
      default: "",
      trim: true,
      maxlength: 64,
    },
    onboardingHiringChallenges: {
      type: [String],
      default: [],
    },
    onboardingOutreachChannels: {
      type: [String],
      default: [],
    },
    onboardingHiringVolume: {
      type: String,
      default: "",
      trim: true,
      maxlength: 32,
    },
    onboardingCompletedAt: {
      type: Date,
      default: null,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },
    /** owner = master after onboarding; member = sub-user */
    accountRole: {
      type: String,
      enum: ["owner", "member"],
      default: undefined,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    memberStatus: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },
    memberPermission: {
      type: String,
      enum: ["search", "full"],
      default: "full",
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
