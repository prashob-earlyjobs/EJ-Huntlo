const CALENDLY_API_BASE = "https://api.calendly.com";

/**
 * Validate a Calendly personal access token and return the authenticated user.
 * @see https://developer.calendly.com/api-docs
 */
async function fetchCalendlyUser(personalAccessToken) {
  const token = String(personalAccessToken || "").trim();
  if (!token) {
    const err = new Error("Calendly personal access token is required.");
    err.statusCode = 400;
    throw err;
  }

  const res = await fetch(`${CALENDLY_API_BASE}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof data?.message === "string"
        ? data.message
        : typeof data?.title === "string"
          ? data.title
          : res.status === 401
            ? "Invalid Calendly token. Check your personal access token and try again."
            : "Could not verify Calendly credentials.";
    const err = new Error(msg);
    err.statusCode = res.status === 401 ? 401 : res.status >= 500 ? 502 : 400;
    throw err;
  }

  const resource = data?.resource;
  if (!resource || typeof resource !== "object") {
    const err = new Error("Unexpected response from Calendly.");
    err.statusCode = 502;
    throw err;
  }

  return {
    name: String(resource.name || "").trim(),
    email: String(resource.email || "").trim(),
    schedulingUrl: String(resource.scheduling_url || "").trim(),
    uri: String(resource.uri || "").trim(),
    slug: String(resource.slug || "").trim(),
  };
}

async function fetchCalendlyEventTypes(personalAccessToken, userUri) {
  const token = String(personalAccessToken || "").trim();
  const user = String(userUri || "").trim();
  if (!token) {
    const err = new Error("Calendly personal access token is required.");
    err.statusCode = 400;
    throw err;
  }
  if (!user) {
    const err = new Error("Calendly user URI is required.");
    err.statusCode = 400;
    throw err;
  }

  const url = new URL(`${CALENDLY_API_BASE}/event_types`);
  url.searchParams.set("user", user);
  url.searchParams.set("active", "true");
  url.searchParams.set("count", "100");
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data?.message === "string"
        ? data.message
        : typeof data?.title === "string"
          ? data.title
          : "Could not load Calendly meetings.";
    const err = new Error(msg);
    err.statusCode = res.status >= 500 ? 502 : 400;
    throw err;
  }

  const collection = Array.isArray(data?.collection) ? data.collection : [];
  return collection
    .filter((row) => row && typeof row === "object")
    .map((row) => ({
      uri: String(row.uri || "").trim(),
      name: String(row.name || "").trim(),
      schedulingUrl: String(row.scheduling_url || "").trim(),
      active: Boolean(row.active),
      durationMinutes: Number(row.duration || 0),
      kind: String(row.kind || "").trim(),
      slug: String(row.slug || "").trim(),
      descriptionPlain: String(row.description_plain || "").trim(),
      color: String(row.color || "").trim(),
    }))
    .filter((row) => row.uri && row.name);
}

module.exports = {
  fetchCalendlyUser,
  fetchCalendlyEventTypes,
};
