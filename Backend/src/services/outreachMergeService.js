function firstNameFromFullName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/).filter(Boolean)[0] || trimmed;
}

/**
 * Replace {{FirstName}}, {{name}}, {{CurrentCompany}}, etc. in subject/body.
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
    Education: "",
    education: "",
    SenderFirstName: sender,
    senderfirstname: sender,
  };

  return raw.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (match, key) => {
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
