/**
 * Tests for the pure routing logic extracted from middleware.ts.
 * We test the logic that determines where a request should go
 * by testing the helper functions and the open-redirect guard separately,
 * since NextRequest/NextResponse are Edge Runtime objects.
 */

// ─── Open redirect guard (same logic as middleware + refresh-redirect) ─────────

function isSafePath(next: string | null | undefined): boolean {
  return !!(next && next.startsWith("/") && !next.startsWith("//"));
}

function safeRedirectDest(next: string | null | undefined, fallback: string): string {
  return isSafePath(next) ? next! : fallback;
}

describe("open-redirect guard", () => {
  it("allows paths starting with /", () => {
    expect(isSafePath("/dashboard/admin")).toBe(true);
  });

  it("allows root /", () => {
    expect(isSafePath("/")).toBe(true);
  });

  it("blocks paths starting with // (protocol-relative URL)", () => {
    expect(isSafePath("//evil.com/phish")).toBe(false);
  });

  it("blocks absolute https:// URLs", () => {
    expect(isSafePath("https://evil.com")).toBe(false);
  });

  it("blocks null", () => {
    expect(isSafePath(null)).toBe(false);
  });

  it("blocks undefined", () => {
    expect(isSafePath(undefined)).toBe(false);
  });

  it("blocks empty string", () => {
    expect(isSafePath("")).toBe(false);
  });

  it("returns next when safe", () => {
    expect(safeRedirectDest("/dashboard", "/fallback")).toBe("/dashboard");
  });

  it("returns fallback when next is unsafe", () => {
    expect(safeRedirectDest("//evil.com", "/fallback")).toBe("/fallback");
    expect(safeRedirectDest("https://evil.com", "/fallback")).toBe("/fallback");
    expect(safeRedirectDest(null, "/fallback")).toBe("/fallback");
  });
});

// ─── JWT expiry check ─────────────────────────────────────────────────────────

function isTokenExpired(exp: number | undefined): boolean {
  if (!exp) return false;
  return exp < Math.floor(Date.now() / 1000);
}

describe("JWT expiry check", () => {
  it("returns false when exp is undefined (no expiry)", () => {
    expect(isTokenExpired(undefined)).toBe(false);
  });

  it("returns false for a future exp timestamp", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(isTokenExpired(future)).toBe(false);
  });

  it("returns true for a past exp timestamp", () => {
    const past = Math.floor(Date.now() / 1000) - 1;
    expect(isTokenExpired(past)).toBe(true);
  });

  it("returns false for exp = 0 (falsy — treated as no expiry by middleware)", () => {
    expect(isTokenExpired(0)).toBe(false);
  });
});

// ─── ROLE_RULES matching ──────────────────────────────────────────────────────

const ROLE_RULES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/dashboard/admin",      roles: ["ADMIN"] },
  { prefix: "/dashboard/gestor",     roles: ["GESTOR", "ADMIN"] },
  { prefix: "/dashboard/fundos",     roles: ["GESTOR", "ADMIN"] },
  { prefix: "/dashboard/engenheiro", roles: ["ENGENHEIRO", "GESTOR_OBRA", "ADMIN"] },
  { prefix: "/dashboard/comercial",  roles: ["COMERCIAL", "PARCEIRO", "ADMIN"] },
  { prefix: "/dashboard/construtor", roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/credito",    roles: ["CONSTRUTOR", "TOMADOR", "ADMIN"] },
  { prefix: "/dashboard/obras",      roles: ["CONSTRUTOR", "TOMADOR", "GESTOR", "GESTOR_OBRA", "ADMIN"] },
  { prefix: "/dashboard/comite",     roles: ["CONSTRUTOR", "TOMADOR", "GESTOR", "ENGENHEIRO", "GESTOR_OBRA", "ADMIN"] },
];

function matchRule(pathname: string) {
  return ROLE_RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
}

function isAuthorized(pathname: string, role: string | null): boolean {
  const rule = matchRule(pathname);
  if (!rule) return true; // no rule = open to any authenticated user
  if (!role) return false;
  return rule.roles.includes(role);
}

describe("ROLE_RULES matching", () => {
  it("matches exact prefix", () => {
    expect(matchRule("/dashboard/admin")).toBeDefined();
  });

  it("matches sub-paths", () => {
    expect(matchRule("/dashboard/admin/usuarios")).toBeDefined();
    expect(matchRule("/dashboard/gestor/metricas/deep")).toBeDefined();
  });

  it("does not match similar but different prefix (/dashboard/adminfoo)", () => {
    expect(matchRule("/dashboard/adminfoo")).toBeUndefined();
  });

  it("returns undefined for unprotected paths (no rule)", () => {
    expect(matchRule("/dashboard")).toBeUndefined();
    expect(matchRule("/dashboard/perfil")).toBeUndefined();
  });
});

describe("authorization check", () => {
  it("allows ADMIN on /dashboard/admin", () => {
    expect(isAuthorized("/dashboard/admin", "ADMIN")).toBe(true);
  });

  it("blocks TOMADOR on /dashboard/admin", () => {
    expect(isAuthorized("/dashboard/admin", "TOMADOR")).toBe(false);
  });

  it("allows GESTOR on /dashboard/gestor", () => {
    expect(isAuthorized("/dashboard/gestor", "GESTOR")).toBe(true);
  });

  it("blocks ENGENHEIRO on /dashboard/gestor", () => {
    expect(isAuthorized("/dashboard/gestor", "ENGENHEIRO")).toBe(false);
  });

  it("allows ENGENHEIRO on /dashboard/engenheiro", () => {
    expect(isAuthorized("/dashboard/engenheiro", "ENGENHEIRO")).toBe(true);
  });

  it("allows GESTOR_OBRA on /dashboard/engenheiro", () => {
    expect(isAuthorized("/dashboard/engenheiro", "GESTOR_OBRA")).toBe(true);
  });

  it("blocks TOMADOR on /dashboard/engenheiro", () => {
    expect(isAuthorized("/dashboard/engenheiro", "TOMADOR")).toBe(false);
  });

  it("allows PARCEIRO on /dashboard/comercial", () => {
    expect(isAuthorized("/dashboard/comercial", "PARCEIRO")).toBe(true);
  });

  it("allows ADMIN on all protected routes", () => {
    const protectedPaths = ROLE_RULES.map((r) => r.prefix);
    for (const path of protectedPaths) {
      expect(isAuthorized(path, "ADMIN")).toBe(true);
    }
  });

  it("allows any authenticated user on unprotected /dashboard paths", () => {
    expect(isAuthorized("/dashboard", "TOMADOR")).toBe(true);
    expect(isAuthorized("/dashboard/perfil", "ENGENHEIRO")).toBe(true);
  });

  it("blocks null role on any protected route", () => {
    expect(isAuthorized("/dashboard/admin", null)).toBe(false);
    expect(isAuthorized("/dashboard/gestor", null)).toBe(false);
  });
});
