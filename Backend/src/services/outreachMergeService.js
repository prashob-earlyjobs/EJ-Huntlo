function firstNameFromFullName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/).filter(Boolean)[0] || trimmed;
}

/**
 * Replace merge tokens in subject/body.
 * Supported: FirstName, CurrentCompany, JobTitle, SenderFirstName (+ legacy name/company aliases).
 * Data: enrollment contactName/company/role + Gmail integration senderName.
 */
function applyMergeFields(text, { contact, senderFirstName = "" }) {
  const raw = String(text || "");
  if (!raw) return raw;

  const firstName = firstNameFromFullName(contact?.name);
  const company = String(contact?.company || "").trim();
  const jobTitle = String(contact?.role || "").trim();
  const sender = String(senderFirstName || "").trim();

  const replacements = {
    FirstName: firstName,
    name: firstName,
    CurrentCompany: company,
    company: company,
    JobTitle: jobTitle,
    jobtitle: jobTitle,
    SenderFirstName: sender,
    senderfirstname: sender,
  };

  return raw.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      return replacements[key];
    }
    const normalized = key.replace(/\s+/g, "");
    if (Object.prototype.hasOwnProperty.call(replacements, normalized)) {
      return replacements[normalized];
    }
    return match;
  });
}

module.exports = { applyMergeFields, firstNameFromFullName };
