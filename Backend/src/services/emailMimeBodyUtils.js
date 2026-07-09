function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeQuotedPrintable(input) {
  const str = String(input || "").replace(/=\r?\n/g, "");
  const bytes = [];
  for (let i = 0; i < str.length; ) {
    if (str[i] === "=" && i + 2 < str.length) {
      const hex = str.slice(i + 1, i + 3);
      if (/^[A-Fa-f0-9]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 3;
        continue;
      }
    }
    bytes.push(str.charCodeAt(i));
    i += 1;
  }
  return Buffer.from(bytes).toString("utf8");
}

function decodePartBody(headers, body) {
  const encoding = String(
    headers.match(/content-transfer-encoding:\s*([^\r\n]+)/i)?.[1] || ""
  )
    .trim()
    .toLowerCase();
  let text = String(body || "").trim();
  if (encoding === "quoted-printable") {
    text = decodeQuotedPrintable(text);
  } else if (encoding === "base64") {
    try {
      text = Buffer.from(text.replace(/\s+/g, ""), "base64").toString("utf8");
    } catch {
      /* keep raw */
    }
  }
  return text;
}

function splitMimeParts(raw) {
  const boundary = raw.match(
    /content-type:[^\r\n]*multipart\/[^;\r\n]*boundary="?([^"\r\n;]+)"?/i
  )?.[1];
  if (!boundary) return [];

  const segments = raw.split(new RegExp(`--${escapeRegExp(boundary)}(?:--)?`, "g"));
  const parts = [];
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed || trimmed === "--") continue;
    const splitIdx = trimmed.search(/\r?\n\r?\n/);
    if (splitIdx === -1) continue;
    parts.push({
      headers: trimmed.slice(0, splitIdx),
      body: trimmed.slice(splitIdx).replace(/^\r?\n\r?\n/, ""),
    });
  }
  return parts;
}

function extractPlainTextFromMimePart(headers, body) {
  if (/content-type:\s*multipart\//i.test(headers)) {
    const nestedRaw = `${headers}\r\n\r\n${body}`;
    const nested = extractPlainTextFromMimeSource(Buffer.from(nestedRaw));
    if (nested.trim()) return nested;
  }
  if (/content-type:\s*text\/plain/i.test(headers)) {
    return decodePartBody(headers, body);
  }
  if (/content-type:\s*text\/html/i.test(headers)) {
    const html = decodePartBody(headers, body);
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  return "";
}

function extractPlainTextFromMimeSource(source) {
  if (!source) return "";
  const raw = source.toString("utf8");
  const headerEnd = raw.search(/\r?\n\r?\n/);
  if (headerEnd === -1) return raw.trim();

  const topHeaders = raw.slice(0, headerEnd);
  const topBody = raw.slice(headerEnd).replace(/^\r?\n\r?\n/, "");

  if (/content-type:\s*multipart\//i.test(topHeaders)) {
    const parts = splitMimeParts(raw);
    for (const part of parts) {
      const text = extractPlainTextFromMimePart(part.headers, part.body);
      if (text.trim()) return text.trim();
    }
  }

  if (/content-type:\s*text\/plain/i.test(topHeaders)) {
    const text = decodePartBody(topHeaders, topBody);
    if (text.trim()) return text.trim();
  }

  if (/content-type:\s*text\/html/i.test(topHeaders)) {
    const text = extractPlainTextFromMimePart(topHeaders, topBody);
    if (text.trim()) return text.trim();
  }

  const cleaned = topBody
    .replace(/^Content-[^\n]+\n/gim, "")
    .replace(/^--[a-f0-9]{10,}.*$/gim, "")
    .trim();
  return decodeQuotedPrintable(cleaned).trim();
}

function stripEmailQuotes(text) {
  let s = String(text || "").trim();
  const patterns = [
    /\s+On .{10,180} wrote:/i,
    /\r?\nOn .{10,180} wrote:\s*[\r\n]?/i,
    /\r?\n-{2,}\s*Original Message\s*-{2,}/i,
    /\r?\nFrom:\s*.+\r?\nSent:\s*/i,
    /\r?\n>+\s/,
  ];
  for (const re of patterns) {
    const match = re.exec(s);
    if (match && match.index > 0) {
      s = s.slice(0, match.index);
      break;
    }
  }
  return s.trim();
}

function toReplyPreview(text, maxLen = 200) {
  let s = stripEmailQuotes(String(text || ""));
  s = s.replace(/^Content-[^\n]+\n/gim, "").trim();
  s = s.replace(/[-]{2,}[a-f0-9]{10,}[-]{0,2}\s*/gi, "").trim();
  s = s.replace(/\u202f/g, " ").replace(/=E2=80=AF/gi, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (!s || s === "-") return "";
  if (s.length > maxLen) return `${s.slice(0, maxLen - 1).trim()}…`;
  return s;
}

module.exports = {
  decodeQuotedPrintable,
  extractPlainTextFromMimeSource,
  toReplyPreview,
};
