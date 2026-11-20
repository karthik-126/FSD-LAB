const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const TOKEN_KEY = "campusToken";
const USER_KEY = "campusUser";

export function getSavedUser() {
    try {
        const saved = localStorage.getItem(USER_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch {
        localStorage.removeItem(USER_KEY);
        return null;
    }
}

export function saveSession(token, user) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        // Keep the old key in sync for any older components still using it.
        localStorage.setItem("token", token);
    }
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem(USER_KEY);
}

export async function apiRequest(path, options = {}) {
    const { auth = true, timeoutMs = 120000, ...requestOptions } = options;
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem("token");
    const headers = { ...(requestOptions.headers || {}) };
    const isFormData = typeof FormData !== "undefined" && requestOptions.body instanceof FormData;
    let body = requestOptions.body;

    if (auth && token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined && body !== null && !isFormData) {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
        if (typeof body !== "string") body = JSON.stringify(body);
    }
    // Do not set Content-Type for FormData: the browser adds the multipart boundary.
    if (isFormData) delete headers["Content-Type"];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(`${API_BASE}${path}`, {
            ...requestOptions,
            headers,
            body,
            signal: controller.signal
        });
        const contentType = response.headers.get("content-type") || "";
        let data;
        if (contentType.includes("application/json")) {
            data = await response.json().catch(() => ({}));
        } else {
            const text = await response.text().catch(() => "");
            data = text ? { message: text } : {};
        }

        if (!response.ok) {
            if (response.status === 401 && auth && token && !path.startsWith("/auth/")) {
                clearSession();
                window.dispatchEvent(new Event("campus-session-expired"));
            }
            throw new Error(data.message || `Request failed (${response.status})`);
        }
        return data;
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("The request took too long. Please check your connection and try again.");
        }
        if (error instanceof TypeError && /fetch/i.test(error.message)) {
            throw new Error(`Cannot reach the Campus Lens backend at ${API_BASE}. Make sure the backend is running.`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export { API_BASE };
