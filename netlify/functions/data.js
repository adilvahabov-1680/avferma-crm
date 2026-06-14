const STORE_NAME = "avferma-crm";
const DATA_KEY = "app-data";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    const store = await getCrmStore();

    if (event.httpMethod === "GET") {
      const raw = await store.get(DATA_KEY);
      const payload = raw ? JSON.parse(raw) : { data: null, savedAt: "" };
      return jsonResponse(200, payload);
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      if (!body.data || typeof body.data !== "object") {
        return jsonResponse(400, { error: "Invalid CRM data" });
      }

      const payload = {
        data: body.data,
        savedAt: body.savedAt || new Date().toISOString()
      };

      await store.set(DATA_KEY, JSON.stringify(payload));
      return jsonResponse(200, { ok: true, savedAt: payload.savedAt });
    }

    return jsonResponse(405, { error: "Method not allowed" });
  } catch (error) {
    return jsonResponse(500, { error: error.message || "Server error" });
  }
};

async function getCrmStore() {
  const { getStore } = await import("@netlify/blobs");
  const siteID = process.env.NETLIFY_BLOBS_SITE_ID || process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;

  if (siteID && token) {
    return getStore({ name: STORE_NAME, siteID, token });
  }

  return getStore(STORE_NAME);
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}
