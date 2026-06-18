import { getRoleHome, roleCanAccess, WEB_ROUTE_RULES, type AppRole } from "@imbobi/schemas";

function findRouteRule(pathname: string) {
  return WEB_ROUTE_RULES.find((rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`));
}

function canAccessWebPath(role: AppRole, pathname: string): boolean {
  const rule = findRouteRule(pathname);
  return rule ? roleCanAccess(role, rule.roles) : true;
}

function redirectTargetFor(role: AppRole): string {
  return getRoleHome(role, "/dashboard");
}

describe("RBAC de rotas web", () => {
  describe("Tomador", () => {
    it("acessa area de construtor/tomador e nao acessa paineis internos", () => {
      expect(canAccessWebPath("TOMADOR", "/dashboard/construtor")).toBe(true);
      expect(canAccessWebPath("TOMADOR", "/dashboard/credito")).toBe(true);
      expect(canAccessWebPath("TOMADOR", "/dashboard/kyc")).toBe(true);

      expect(canAccessWebPath("TOMADOR", "/dashboard/gestor")).toBe(false);
      expect(canAccessWebPath("TOMADOR", "/dashboard/engenheiro")).toBe(false);
      expect(canAccessWebPath("TOMADOR", "/dashboard/comercial")).toBe(false);
      expect(canAccessWebPath("TOMADOR", "/dashboard/admin")).toBe(false);
      expect(redirectTargetFor("TOMADOR")).toBe("/dashboard");
    });
  });

  describe("Admin", () => {
    it("acessa rotas administrativas e modulos operacionais compartilhados", () => {
      expect(canAccessWebPath("ADMIN", "/dashboard/admin")).toBe(true);
      expect(canAccessWebPath("ADMIN", "/dashboard/admin/usuarios")).toBe(true);
      expect(canAccessWebPath("ADMIN", "/dashboard/gestor")).toBe(true);
      expect(canAccessWebPath("ADMIN", "/dashboard/engenheiro")).toBe(true);
      expect(canAccessWebPath("ADMIN", "/dashboard/comercial")).toBe(true);
      expect(canAccessWebPath("ADMIN", "/dashboard/construtor")).toBe(true);
      expect(redirectTargetFor("ADMIN")).toBe("/dashboard/admin");
    });
  });

  describe("Gestor do Fundo", () => {
    it("acessa gestor/fundos/relatorios e nao acessa comercial/engenharia/tomador", () => {
      expect(canAccessWebPath("GESTOR", "/dashboard/gestor")).toBe(true);
      expect(canAccessWebPath("GESTOR", "/dashboard/gestor/etapas")).toBe(true);
      expect(canAccessWebPath("GESTOR", "/dashboard/fundos")).toBe(true);
      expect(canAccessWebPath("GESTOR", "/dashboard/relatorios")).toBe(true);

      expect(canAccessWebPath("GESTOR", "/dashboard/comercial")).toBe(false);
      expect(canAccessWebPath("GESTOR", "/dashboard/engenheiro")).toBe(false);
      expect(canAccessWebPath("GESTOR", "/dashboard/construtor")).toBe(false);
      expect(redirectTargetFor("GESTOR")).toBe("/dashboard/gestor");
    });
  });

  describe("Engenheiro", () => {
    it("acessa engenharia e obras, mas nao credito/comercial/gestor", () => {
      expect(canAccessWebPath("ENGENHEIRO", "/dashboard/engenheiro")).toBe(true);
      expect(canAccessWebPath("ENGENHEIRO", "/dashboard/engenheiro/vistoria")).toBe(true);
      expect(canAccessWebPath("ENGENHEIRO", "/dashboard/obras")).toBe(true);

      expect(canAccessWebPath("ENGENHEIRO", "/dashboard/credito")).toBe(false);
      expect(canAccessWebPath("ENGENHEIRO", "/dashboard/comercial")).toBe(false);
      expect(canAccessWebPath("ENGENHEIRO", "/dashboard/gestor")).toBe(false);
      expect(canAccessWebPath("ENGENHEIRO", "/dashboard/admin")).toBe(false);
      expect(redirectTargetFor("ENGENHEIRO")).toBe("/dashboard/engenheiro");
    });

    it("mantem GESTOR_OBRA como alias operacional de engenharia", () => {
      expect(canAccessWebPath("GESTOR_OBRA", "/dashboard/engenheiro")).toBe(true);
      expect(canAccessWebPath("GESTOR_OBRA", "/dashboard/obras")).toBe(true);
      expect(canAccessWebPath("GESTOR_OBRA", "/dashboard/credito")).toBe(false);
      expect(redirectTargetFor("GESTOR_OBRA")).toBe("/dashboard/engenheiro");
    });
  });

  describe("Comercial/Parceiro", () => {
    it("acessa dashboard comercial e nao acessa paineis internos", () => {
      for (const role of ["COMERCIAL", "PARCEIRO"] as const) {
        expect(canAccessWebPath(role, "/dashboard/comercial")).toBe(true);
        expect(canAccessWebPath(role, "/dashboard/comercial/leads")).toBe(true);

        expect(canAccessWebPath(role, "/dashboard/admin")).toBe(false);
        expect(canAccessWebPath(role, "/dashboard/gestor")).toBe(false);
        expect(canAccessWebPath(role, "/dashboard/engenheiro")).toBe(false);
        expect(canAccessWebPath(role, "/dashboard/credito")).toBe(false);
        expect(redirectTargetFor(role)).toBe("/dashboard/comercial");
      }
    });
  });

  it("cobre as rotas principais dos 5 paineis no middleware compartilhado", () => {
    const requiredPrefixes = [
      "/dashboard/construtor",
      "/dashboard/gestor",
      "/dashboard/engenheiro",
      "/dashboard/comercial",
      "/dashboard/admin",
    ];

    for (const prefix of requiredPrefixes) {
      expect(findRouteRule(prefix)).toBeDefined();
    }
  });
});
