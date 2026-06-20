const {
  upsertVoiceCallStatus,
  upsertVoiceCallResult,
  upsertVoiceCallRecording,
  upsertVoiceCallSummary,
} = require("../services/campaignVoiceCommsService");

async function receiveHunarCallStatusHandler(req, res) {
  const campaignId = String(req.query?.campaignId || "").trim();
  try {
    const call = await upsertVoiceCallStatus(campaignId, req.body || {});
    console.info("[hunar-voice] call-status saved", {
      campaignId,
      callId: call?.callId,
      status: call?.status,
    });
    return res.status(200).json({ success: true, call });
  } catch (error) {
    console.error("[hunar-voice] call-status error:", error?.message || error);
    const status = error.statusCode && Number.isFinite(error.statusCode) ? error.statusCode : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to process call status callback",
    });
  }
}

async function receiveHunarCallResultHandler(req, res) {
  const campaignId = String(req.query?.campaignId || "").trim();
  try {
    const call = await upsertVoiceCallResult(campaignId, req.body || {});
    console.info("[hunar-voice] call-result saved", {
      campaignId,
      callId: call?.callId,
      finalOutcome: call?.callResult?.finalOutcome || "",
      interestLevel: call?.callResult?.interestLevel || "",
    });

    return res.status(200).json({ success: true, call });
  } catch (error) {
    console.error("[hunar-voice] call-result error:", error?.message || error);
    const status = error.statusCode && Number.isFinite(error.statusCode) ? error.statusCode : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to process call result callback",
    });
  }
}

async function receiveHunarCallRecordingHandler(req, res) {
  const campaignId = String(req.query?.campaignId || "").trim();
  try {
    const call = await upsertVoiceCallRecording(campaignId, req.body || {});
    console.info("[hunar-voice] call-recording saved", {
      campaignId,
      callId: call?.callId,
      recordingUrl: call?.recordingUrl,
    });
    return res.status(200).json({ success: true, call });
  } catch (error) {
    console.error("[hunar-voice] call-recording error:", error?.message || error);
    const status = error.statusCode && Number.isFinite(error.statusCode) ? error.statusCode : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to process call recording callback",
    });
  }
}

async function receiveHunarCallSummaryHandler(req, res) {
  const campaignId = String(req.query?.campaignId || "").trim();
  try {
    const call = await upsertVoiceCallSummary(campaignId, req.body || {});
    console.info("[hunar-voice] call-summary saved", {
      campaignId,
      callId: call?.callId,
      hasSummary: Boolean(call?.summaryText),
    });
    return res.status(200).json({ success: true, call });
  } catch (error) {
    console.error("[hunar-voice] call-summary error:", error?.message || error);
    const status = error.statusCode && Number.isFinite(error.statusCode) ? error.statusCode : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to process call summary callback",
    });
  }
}

module.exports = {
  receiveHunarCallStatusHandler,
  receiveHunarCallResultHandler,
  receiveHunarCallRecordingHandler,
  receiveHunarCallSummaryHandler,
};
