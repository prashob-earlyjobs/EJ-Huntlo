const fs = require("fs");
const path = require("path");

/**
 * AI / Gemini — Vertex via service account JSON in env.
 *
 * GCP_CREDENTIALS_JSON        — service account JSON (one line or multiline in .env)
 * GCP_CREDENTIALS_JSON_BASE64 — optional base64 of the same JSON
 *
 * project_id comes from the JSON; optional overrides:
 *   GCP_PROJECT_ID, GCP_LOCATION, GEMINI_MODEL
 *
 * Fallback: GEMINI_API_KEY (AI Studio)
 */

const DEFAULT_LOCATION = "us-central1";
const DEFAULT_MODEL = "gemini-2.5-flash";

/** Map retired or alias IDs to a Vertex model available in most projects. */
const VERTEX_MODEL_ALIASES = {
  "gemini-2.0-flash": "gemini-2.5-flash",
  "gemini-2.0-flash-001": "gemini-2.5-flash",
  "gemini-2.0-flash-lite": "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite-001": "gemini-2.5-flash-lite",
};

function resolveModelName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return DEFAULT_MODEL;
  return VERTEX_MODEL_ALIASES[trimmed] || trimmed;
}

function env(name) {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : "";
}

function unwrapQuotedString(value) {
  let s = String(value || "").trim();
  if (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"'))
  ) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

const SECRETS_JSON_PATH = path.join(process.cwd(), "secrets", "gcp-credentials.json");

/** Extract a top-level `{ ... }` JSON object from text (respects strings). */
function extractBraceDelimitedJson(text) {
  const trimmed = String(text || "").trimStart();
  if (!trimmed.startsWith("{")) return "";

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return trimmed.slice(0, i + 1);
      }
    }
  }

  return "";
}

/**
 * Scan .env for real assignments only (ignore commented examples that mention GCP_CREDENTIALS_JSON=).
 */
function scanEnvFileForCredentials(envPath) {
  if (!fs.existsSync(envPath)) return { jsonBlock: "", filePath: "" };

  const content = fs.readFileSync(envPath, "utf8");
  const assignRe = /^(?!#)[ \t]*GCP_CREDENTIALS_JSON\s*=\s*(.*)$/gm;

  let jsonBlock = "";
  let filePath = "";
  let match;

  while ((match = assignRe.exec(content)) !== null) {
    const value = match[1].trim();
    const valueStart = match.index + match[0].length;
    const rest = content.slice(valueStart);

    if (value.startsWith("{")) {
      const bracePos = content.indexOf("{", match.index);
      const block = extractBraceDelimitedJson(
        bracePos >= 0 ? content.slice(bracePos) : rest
      );
      if (block) jsonBlock = block;
    } else {
      const pathValue = value.split(/#|\r|\n/)[0].trim();
      if (pathValue) filePath = pathValue;
    }
  }

  return { jsonBlock, filePath };
}

function readCredentialsFromEnvFiles() {
  for (const fileName of [".env", ".env.local"]) {
    const found = scanEnvFileForCredentials(path.join(process.cwd(), fileName));
    if (found.jsonBlock) {
      return { kind: "json", value: found.jsonBlock };
    }
    if (found.filePath) {
      return { kind: "path", value: found.filePath };
    }
  }
  return null;
}

function loadCredentialsFromJsonFile(filePath) {
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return null;
  }
  return parseCredentialsObject(fs.readFileSync(resolved, "utf8"));
}

function isPlaceholderCredentials(credentials) {
  if (!credentials || typeof credentials !== "object") return false;
  const projectId = String(credentials.project_id || "").trim();
  const privateKey = String(credentials.private_key || "");
  const clientEmail = String(credentials.client_email || "");
  return (
    projectId === "your-gcp-project-id" ||
    privateKey.includes("...") ||
    clientEmail.startsWith("your-sa@")
  );
}

function assertRealCredentials(credentials) {
  if (!isPlaceholderCredentials(credentials)) return;
  const err = new Error(
    "GCP_CREDENTIALS_JSON in Backend/.env is still the example placeholder. Paste your real service account JSON from Google Cloud (IAM → Service accounts → Keys)."
  );
  err.statusCode = 503;
  throw err;
}

function parseCredentialsObject(text) {
  const raw = unwrapQuotedString(text);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("not an object");
    }
    assertRealCredentials(parsed);
    return parsed;
  } catch (parseErr) {
    if (parseErr.statusCode === 503) throw parseErr;
    const invalid = new Error(
      "GCP_CREDENTIALS_JSON must be valid service account JSON in Backend/.env."
    );
    invalid.statusCode = 503;
    throw invalid;
  }
}

function parseBase64Credentials() {
  const b64 = env("GCP_CREDENTIALS_JSON_BASE64");
  if (!b64) return null;
  try {
    const json = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    const err = new Error(
      "GCP_CREDENTIALS_JSON_BASE64 is not valid base64-encoded JSON."
    );
    err.statusCode = 503;
    throw err;
  }
}

function loadCredentialsFromEnv() {
  const fromB64 = parseBase64Credentials();
  if (fromB64) return fromB64;

  if (fs.existsSync(SECRETS_JSON_PATH)) {
    const fromSecrets = loadCredentialsFromJsonFile(SECRETS_JSON_PATH);
    if (fromSecrets) return fromSecrets;
  }

  const fromEnvFiles = readCredentialsFromEnvFiles();
  if (fromEnvFiles?.kind === "json") {
    return parseCredentialsObject(fromEnvFiles.value);
  }
  if (fromEnvFiles?.kind === "path") {
    const fromPath = loadCredentialsFromJsonFile(fromEnvFiles.value);
    if (fromPath) return fromPath;
  }

  let raw = env("GCP_CREDENTIALS_JSON");
  if (raw && !raw.trimStart().startsWith("{")) {
    const fromPath = loadCredentialsFromJsonFile(raw);
    if (fromPath) return fromPath;
  }

  if (raw === "{" || (raw.startsWith("{") && !raw.endsWith("}"))) {
    raw = "";
  }

  if (!raw) return null;
  return parseCredentialsObject(raw);
}

function resolveProjectId(credentials) {
  return (
    env("GCP_PROJECT_ID") ||
    String(credentials?.project_id || credentials?.projectId || "").trim()
  );
}

function getAiConfig() {
  const credentials = loadCredentialsFromEnv();
  const useVertex = Boolean(credentials);
  const projectId = credentials ? resolveProjectId(credentials) : "";
  const gcpLocation = env("GCP_LOCATION") || DEFAULT_LOCATION;
  const geminiModel = resolveModelName(env("GEMINI_MODEL") || DEFAULT_MODEL);
  const geminiApiKey = env("GEMINI_API_KEY");

  return {
    useVertex,
    useAiStudio: !useVertex && Boolean(geminiApiKey),
    credentials,
    projectId,
    location: gcpLocation,
    model: geminiModel,
    geminiApiKey,
  };
}

function requireVertexConfig() {
  const cfg = getAiConfig();
  if (!cfg.useVertex) {
    const err = new Error(
      "Set GCP_CREDENTIALS_JSON in Backend/.env (service account JSON)."
    );
    err.statusCode = 503;
    throw err;
  }
  if (!cfg.projectId) {
    const err = new Error(
      "Service account JSON must include project_id (or set GCP_PROJECT_ID)."
    );
    err.statusCode = 503;
    throw err;
  }
  return cfg;
}

function requireAiStudioKey() {
  const key = env("GEMINI_API_KEY");
  if (!key) {
    const err = new Error("Set GEMINI_API_KEY in Backend/.env.");
    err.statusCode = 503;
    throw err;
  }
  return key;
}

module.exports = {
  getAiConfig,
  requireVertexConfig,
  requireAiStudioKey,
  env,
  loadCredentialsFromEnv,
};
