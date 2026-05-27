const mongoose = require("mongoose");
const { generateOutreachSequenceFromJd } = require("../services/outreachAiService");

function invalidSession(res) {
  return res.status(401).json({ success: false, message: "Authentication required" });
}

function handleError(res, error) {
  const status =
    error.statusCode && Number.isFinite(error.statusCode) ? error.statusCode : 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Request failed",
  });
}

const generateSequenceFromJdHandler = async (req, res) => {
  try {
    const uid = req.auth?.userId;
    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return invalidSession(res);

    const jobDescription = String(req.body?.jobDescription || "").trim();
    const planName = String(req.body?.planName || "").trim();

    const result = await generateOutreachSequenceFromJd({
      jobDescription,
      planName,
    });

    return res.status(200).json({
      success: true,
      ...result,
      message: "Outreach sequence generated",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  generateSequenceFromJdHandler,
};
