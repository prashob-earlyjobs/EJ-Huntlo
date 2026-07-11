const mongoose = require("mongoose");
const { sendCampaignEmail } = require("./emailSendService");
const { sendWhatsAppSessionMessage } = require("./whatsappSendService");
const { listConnectedEmailIntegrations } = require("./emailIntegrationService");
const { assertWhatsAppReadyForSend } = require("./whatsappSendService");
const { assertValidRecipientPhone } = require("./whatsappPhoneUtils");
const { getSenderFirstNameForEmail } = require("./emailIntegrationService");

function firstName(name) {
  const parts = String(name || "").trim().split(/\s+/);
  return parts[0] || "there";
}

function buildSchedulingEmailBody({ candidateName, meetingName, role, schedulingUrl, senderName }) {
  const greeting = `Hi ${firstName(candidateName)},`;
  const roleClause = role ? ` for the ${role} role` : meetingName ? ` — ${meetingName}` : "";
  const lines = [
    greeting,
    "",
    `You are invited to schedule an interview${roleClause}.`,
    "",
    "Please pick a time that works for you:",
    schedulingUrl,
    "",
    "Thank you,",
    senderName || "Recruitment Team",
  ];
  return lines.join("\n");
}

function buildSchedulingWhatsAppBody({ candidateName, meetingName, role, schedulingUrl }) {
  const roleClause = role ? ` for the ${role} role` : meetingName ? ` (${meetingName})` : "";
  return `Hi ${firstName(candidateName)}, you are invited to schedule an interview${roleClause}. Pick a time here: ${schedulingUrl}`;
}

async function getConnectedChannelAvailability(userId, emailIntegrationId) {
  const emailIntegrations = await listConnectedEmailIntegrations(userId);
  let whatsapp = false;
  try {
    await assertWhatsAppReadyForSend(userId);
    whatsapp = true;
  } catch {
    whatsapp = false;
  }

  const email =
    emailIntegrations.length > 0 &&
  (emailIntegrationId
    ? emailIntegrations.some((row) => String(row._id) === String(emailIntegrationId))
    : true);

  return {
    email: Boolean(email),
    whatsapp,
    emailIntegrationId:
      emailIntegrationId && emailIntegrations.some((row) => String(row._id) === String(emailIntegrationId))
        ? String(emailIntegrationId)
        : emailIntegrations[0]
          ? String(emailIntegrations[0]._id)
          : "",
  };
}

function resolveChannels(requested = {}, available = {}) {
  const wantEmail = requested.email !== false;
  const wantWhatsapp = requested.whatsapp !== false;
  return {
    email: wantEmail && available.email,
    whatsapp: wantWhatsapp && available.whatsapp,
  };
}

/**
 * Send a Calendly scheduling link to a candidate via connected email and/or WhatsApp.
 */
async function deliverCalendlyLink({
  userId,
  candidateName,
  email,
  phone,
  schedulingUrl,
  meetingName = "",
  role = "",
  channels = {},
  emailIntegrationId = "",
}) {
  const url = String(schedulingUrl || "").trim();
  if (!url) {
    const err = new Error("Scheduling URL is required.");
    err.statusCode = 400;
    throw err;
  }

  const available = await getConnectedChannelAvailability(userId, emailIntegrationId);
  const active = resolveChannels(channels, available);

  if (!active.email && !active.whatsapp) {
    const err = new Error(
      "Connect email or WhatsApp under Integrations to send scheduling links to candidates."
    );
    err.statusCode = 400;
    throw err;
  }

  const senderName = await getSenderFirstNameForEmail(userId);
  const result = { emailSent: false, whatsappSent: false, errors: [] };

  if (active.email) {
    const toEmail = String(email || "").trim().toLowerCase();
    if (!toEmail) {
      result.errors.push("email: missing candidate email");
    } else {
      try {
        const body = buildSchedulingEmailBody({
          candidateName,
          meetingName,
          role,
          schedulingUrl: url,
          senderName,
        });
        const subject = role
          ? `Schedule your interview — ${role}`
          : meetingName
            ? `Schedule your interview — ${meetingName}`
            : "Schedule your interview";
        await sendCampaignEmail(
          userId,
          { to: toEmail, subject, body },
          { integrationId: available.emailIntegrationId || undefined }
        );
        result.emailSent = true;
      } catch (err) {
        result.errors.push(`email: ${err?.message || "send failed"}`);
      }
    }
  }

  if (active.whatsapp) {
    try {
      const normalizedPhone = assertValidRecipientPhone(phone);
      const body = buildSchedulingWhatsAppBody({
        candidateName,
        meetingName,
        role,
        schedulingUrl: url,
      });
      await sendWhatsAppSessionMessage(userId, { to: normalizedPhone, body });
      result.whatsappSent = true;
    } catch (err) {
      result.errors.push(`whatsapp: ${err?.message || "send failed"}`);
    }
  }

  if (!result.emailSent && !result.whatsappSent) {
    const err = new Error(result.errors.join("; ") || "Could not deliver scheduling link.");
    err.statusCode = 400;
    throw err;
  }

  return result;
}

/**
 * Infer which channels to use for a campaign candidate based on campaign channel + contact info.
 */
function channelsForCampaignCandidate(campaign, candidate, override = {}) {
  if (override.email !== undefined || override.whatsapp !== undefined) {
    return override;
  }
  const primary = String(campaign?.channel || campaign?.primaryChannel || "").toLowerCase();
  if (primary === "email") return { email: true, whatsapp: false };
  if (primary === "whatsapp") return { email: false, whatsapp: true };
  return { email: true, whatsapp: true };
}

module.exports = {
  deliverCalendlyLink,
  getConnectedChannelAvailability,
  channelsForCampaignCandidate,
  buildSchedulingEmailBody,
  buildSchedulingWhatsAppBody,
};
