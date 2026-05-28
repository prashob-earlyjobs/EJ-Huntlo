const CALENDLY_API_BASE = "https://api.calendly.com";
const DEFAULT_EVENT_TYPE_PAGE_SIZE = 100;
const MAX_EVENT_TYPE_PAGES = 5;

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
  const resolvedUser = user || (await fetchCalendlyUser(token)).uri;
  if (!resolvedUser) {
    const err = new Error("Unable to load Calendly user profile.");
    err.statusCode = 502;
    throw err;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const links = [];
  let pageToken = "";
  let page = 0;

  while (page < MAX_EVENT_TYPE_PAGES) {
    page += 1;
    const qs = new URLSearchParams({
      user: resolvedUser,
      active: "true",
      sort: "name:asc",
      count: String(DEFAULT_EVENT_TYPE_PAGE_SIZE),
    });
    if (pageToken) qs.set("page_token", pageToken);

    const res = await fetch(`${CALENDLY_API_BASE}/event_types?${qs.toString()}`, { headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        typeof data?.message === "string"
          ? data.message
          : typeof data?.title === "string"
            ? data.title
            : res.status === 401
              ? "Invalid Calendly token. Reconnect Calendly and try again."
              : "Could not load Calendly event types.";
      const err = new Error(msg);
      err.statusCode = res.status === 401 ? 401 : res.status >= 500 ? 502 : 400;
      throw err;
    }

    const collection = Array.isArray(data?.collection) ? data.collection : [];
    for (const item of collection) {
      if (!item || typeof item !== "object") continue;
      const schedulingUrl = String(item.scheduling_url || "").trim();
      if (!schedulingUrl) continue;
      links.push({
        name: String(item.name || "").trim() || "Calendly event",
        schedulingUrl,
        slug: String(item.slug || "").trim(),
        durationMinutes:
          typeof item.duration === "number" && Number.isFinite(item.duration)
            ? item.duration
            : null,
      });
    }

    const nextPage = String(data?.pagination?.next_page_token || "").trim();
    if (!nextPage) break;
    pageToken = nextPage;
  }

  return links;
}

module.exports = {
  fetchCalendlyUser,
  fetchCalendlyEventTypes,
};
