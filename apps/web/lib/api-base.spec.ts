import { getApiBaseUrl, getApiV1Url, getApiV1Fallbacks, PRODUCTION_API_URL } from "./api-base";

afterEach(() => {
  delete process.env["NEXT_PUBLIC_API_URL"];
  delete process.env["IMOBI_API_URL"];
  delete process.env["VERCEL"];
  delete process.env["NODE_ENV"];
});

describe("getApiBaseUrl", () => {
  it("uses NEXT_PUBLIC_API_URL when valid and not localhost", () => {
    process.env["NEXT_PUBLIC_API_URL"] = "https://api.myapp.com";
    expect(getApiBaseUrl()).toBe("https://api.myapp.com");
  });

  it("strips trailing slash from env URL", () => {
    process.env["NEXT_PUBLIC_API_URL"] = "https://api.myapp.com/";
    expect(getApiBaseUrl()).toBe("https://api.myapp.com");
  });

  it("falls through to production URL when VERCEL=1 and no env set", () => {
    process.env["VERCEL"] = "1";
    expect(getApiBaseUrl()).toBe(PRODUCTION_API_URL);
  });

  it("falls through to production URL when NODE_ENV=production and no env set", () => {
    process.env["NODE_ENV"] = "production";
    expect(getApiBaseUrl()).toBe(PRODUCTION_API_URL);
  });

  it("returns localhost:4000 when no env and not production", () => {
    expect(getApiBaseUrl()).toBe("http://localhost:4000");
  });

  it("ignores localhost URL in NEXT_PUBLIC_API_URL and falls through", () => {
    process.env["NEXT_PUBLIC_API_URL"] = "http://localhost:5000";
    // not production env → should fall through to localhost:4000
    expect(getApiBaseUrl()).toBe("http://localhost:4000");
  });

  it("ignores 127.0.0.1 URL in NEXT_PUBLIC_API_URL", () => {
    process.env["NEXT_PUBLIC_API_URL"] = "http://127.0.0.1:4000";
    expect(getApiBaseUrl()).toBe("http://localhost:4000");
  });
});

describe("getApiV1Url", () => {
  it("appends /api/v1 to base URL", () => {
    process.env["NEXT_PUBLIC_API_URL"] = "https://api.myapp.com";
    expect(getApiV1Url()).toBe("https://api.myapp.com/api/v1");
  });

  it("does not double-append /api/v1 when already present", () => {
    process.env["NEXT_PUBLIC_API_URL"] = "https://api.myapp.com/api/v1";
    expect(getApiV1Url()).toBe("https://api.myapp.com/api/v1");
  });
});

describe("getApiV1Fallbacks", () => {
  it("returns an array with at least the primary URL", () => {
    process.env["NEXT_PUBLIC_API_URL"] = "https://api.myapp.com";
    const fallbacks = getApiV1Fallbacks();
    expect(fallbacks).toContain("https://api.myapp.com/api/v1");
  });

  it("includes the production API URL as a fallback", () => {
    const fallbacks = getApiV1Fallbacks();
    expect(fallbacks.some((u) => u.includes("render.com"))).toBe(true);
  });

  it("contains no duplicate URLs", () => {
    const fallbacks = getApiV1Fallbacks();
    expect(fallbacks.length).toBe(new Set(fallbacks).size);
  });
});
