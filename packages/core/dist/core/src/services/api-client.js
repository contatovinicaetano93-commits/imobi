"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = exports.apiClient = void 0;
const _base = typeof process !== "undefined"
    ? (process.env["NEXT_PUBLIC_API_URL"] ?? process.env["EXPO_PUBLIC_API_URL"] ?? "http://localhost:4000")
    : "http://localhost:4000";
const BASE_URL = _base.endsWith("/api/v1") ? _base : `${_base}/api/v1`;
class ApiError extends Error {
    constructor(status, message, code) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = "ApiError";
    }
}
exports.ApiError = ApiError;
async function request(path, options = {}) {
    const { token, ...init } = options;
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (token)
        headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.message ?? res.statusText, body.code);
    }
    if (res.status === 204)
        return undefined;
    return res.json();
}
exports.apiClient = {
    get: (path, token) => request(path, { method: "GET", token }),
    post: (path, body, token) => request(path, {
        method: "POST",
        body: JSON.stringify(body),
        token,
    }),
    patch: (path, body, token) => request(path, {
        method: "PATCH",
        body: JSON.stringify(body),
        token,
    }),
    delete: (path, token) => request(path, { method: "DELETE", token }),
};
