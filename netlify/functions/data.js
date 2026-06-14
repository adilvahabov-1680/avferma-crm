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
    const { getStore } = await import("@netlify/blobs");
    const store = getStore(STORE_NAME);

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

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}
