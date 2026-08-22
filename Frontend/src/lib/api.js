const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8080"
    : "https://grocery-delivery-backend-dvr3.onrender.com");
export function getToken() {
  return localStorage.getItem("token") || "";
}
export function setToken(t) {
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

export async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
   const res = await fetch(`${BASE_URL}${path}`, {
  method: method || "GET",
  headers: {
    ...headers,
    "Content-Type": "application/json",
  },
  ...(body && method !== "GET" ? { body: JSON.stringify(body) } : {}),
});
  if (!res.ok) {
    let err = null;
    try { err = await res.json(); } catch { /* non-JSON body */ }
    const message = typeof err === "string"
      ? err
      : (err && (err.error || err.message)) || res.statusText || "Request failed";
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

// Maps a failed api() call to a short, user-safe message.
export function errorMessage(error, fallback = "Something went wrong") {
  if (!error) return fallback;
  switch (error.status) {
    case 401: return "Your session has expired. Please sign in again.";
    case 403: return "You do not have permission to perform this action.";
    case 404: return "The requested item was not found.";
    case 500: return "The server hit an error. Please try again shortly.";
    default: return error.message || fallback;
  }
}
export async function apiForm(path, formData, { auth = false, method = "POST" } = {}) {
  const headers = {};
  
  // ✅ FIX: Always check for token if auth is true
  if (auth) {
    const t = getToken();
    if (t) {
      headers.Authorization = `Bearer ${t}`;
    } else {
      throw new Error("Authentication required but no token found. Please login first.");
    }
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: formData
    });

    if (!res.ok) {
      let err;
      try {
        err = await res.json();
      } catch {
        err = { error: res.statusText, status: res.status };
      }
      throw new Error(err.error || `HTTP ${res.status}: Request failed`);
    }

    return await res.json();
  } catch (error) {
    console.error(`[v0] API Error on ${method} ${path}:`, error.message);
    throw error;
  }
}

export function fileUrl(url) {
  if (!url) return "";

  // already full URL
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  // frontend asset path - let Vite serve it
  if (
    url.startsWith("/src/") ||
    url.startsWith("src/") ||
    url.startsWith("/assets/") ||
    url.startsWith("assets/")
  ) {
    return url;
  }

  // backend uploaded file
  return `${BASE_URL}${url}`;
}

export async function getCategories() {
  return await api("/products/categories");
}