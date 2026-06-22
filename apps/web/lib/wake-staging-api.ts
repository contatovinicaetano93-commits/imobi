function healthUrl() {
  const base = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
  const normalized = base.endsWith("/api/v1") ? base : `${base}/api/v1`;
  return `${normalized}/health`;
}

/** Best-effort ping to wake cold-start API hosts (e.g. Render free tier). */
export async function wakeStagingApi(maxAttempts = 2) {
  const url = healthUrl();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      if (res.ok) return;
    } catch {
      // ignore — landing page should still render
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
}
