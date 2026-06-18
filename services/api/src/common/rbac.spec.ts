import {
  getMobileRoleHome,
  getRoleHome,
  isManagerRole,
  normalizeUserRole,
  roleCanAccess,
  roleCanAccessFeature,
  roleCanAccessMobileTab,
  ROLE_LABELS,
} from "@imbobi/schemas";

describe("RBAC compartilhado", () => {
  describe("normalizeUserRole", () => {
    it("normaliza GESTOR_FUNDO para GESTOR", () => {
      expect(normalizeUserRole("GESTOR_FUNDO")).toBe("GESTOR");
    });

    it("mantem roles canonicos conhecidos", () => {
      expect(normalizeUserRole("TOMADOR")).toBe("TOMADOR");
      expect(normalizeUserRole("ADMIN")).toBe("ADMIN");
      expect(normalizeUserRole("GESTOR")).toBe("GESTOR");
      expect(normalizeUserRole("ENGENHEIRO")).toBe("ENGENHEIRO");
      expect(normalizeUserRole("COMERCIAL")).toBe("COMERCIAL");
    });

    it("rejeita roles desconhecidos", () => {
      expect(normalizeUserRole("SUPERUSER")).toBeNull();
      expect(normalizeUserRole(null)).toBeNull();
      expect(normalizeUserRole(undefined)).toBeNull();
    });
  });

  describe("roleCanAccess", () => {
    it("permite alias legado quando o grupo exige role canonico", () => {
      expect(roleCanAccess("GESTOR_FUNDO", ["GESTOR", "ADMIN"])).toBe(true);
    });

    it("permite comercial/parceiro no grupo comercial", () => {
      expect(roleCanAccess("COMERCIAL", ["COMERCIAL", "PARCEIRO", "ADMIN"])).toBe(true);
      expect(roleCanAccess("PARCEIRO", ["COMERCIAL", "PARCEIRO", "ADMIN"])).toBe(true);
    });

    it("bloqueia perfis fora do grupo", () => {
      expect(roleCanAccess("TOMADOR", ["GESTOR", "ADMIN"])).toBe(false);
      expect(roleCanAccess("COMERCIAL", ["ENGENHEIRO", "GESTOR_OBRA", "ADMIN"])).toBe(false);
    });
  });

  describe("roleCanAccessFeature", () => {
    it("protege funcoes de tomador/construtor", () => {
      expect(roleCanAccessFeature("TOMADOR", "credito")).toBe(true);
      expect(roleCanAccessFeature("CONSTRUTOR", "credito")).toBe(true);
      expect(roleCanAccessFeature("COMERCIAL", "credito")).toBe(false);
    });

    it("protege funcoes do gestor do fundo", () => {
      expect(roleCanAccessFeature("GESTOR", "fundos")).toBe(true);
      expect(roleCanAccessFeature("GESTOR_FUNDO", "relatorios")).toBe(true);
      expect(roleCanAccessFeature("ENGENHEIRO", "fundos")).toBe(false);
    });

    it("protege funcoes comerciais", () => {
      expect(roleCanAccessFeature("COMERCIAL", "comercial")).toBe(true);
      expect(roleCanAccessFeature("PARCEIRO", "comercial")).toBe(true);
      expect(roleCanAccessFeature("TOMADOR", "comercial")).toBe(false);
    });
  });

  describe("roleCanAccessMobileTab", () => {
    it("mostra Vistorias somente para engenharia/admin", () => {
      expect(roleCanAccessMobileTab("ENGENHEIRO", "engenharia")).toBe(true);
      expect(roleCanAccessMobileTab("GESTOR_OBRA", "engenharia")).toBe(true);
      expect(roleCanAccessMobileTab("ADMIN", "engenharia")).toBe(true);
      expect(roleCanAccessMobileTab("TOMADOR", "engenharia")).toBe(false);
      expect(roleCanAccessMobileTab("COMERCIAL", "engenharia")).toBe(false);
    });

    it("mostra Obras para perfis operacionais", () => {
      expect(roleCanAccessMobileTab("TOMADOR", "obras")).toBe(true);
      expect(roleCanAccessMobileTab("ENGENHEIRO", "obras")).toBe(true);
      expect(roleCanAccessMobileTab("GESTOR_OBRA", "obras")).toBe(true);
      expect(roleCanAccessMobileTab("COMERCIAL", "obras")).toBe(false);
    });

    it("mostra Credito somente para tomador/construtor/admin", () => {
      expect(roleCanAccessMobileTab("TOMADOR", "credito")).toBe(true);
      expect(roleCanAccessMobileTab("CONSTRUTOR", "credito")).toBe(true);
      expect(roleCanAccessMobileTab("ADMIN", "credito")).toBe(true);
      expect(roleCanAccessMobileTab("ENGENHEIRO", "credito")).toBe(false);
      expect(roleCanAccessMobileTab("PARCEIRO", "credito")).toBe(false);
    });

    it("mostra Perfil para qualquer autenticado conhecido", () => {
      expect(roleCanAccessMobileTab("TOMADOR", "perfil")).toBe(true);
      expect(roleCanAccessMobileTab("GESTOR", "perfil")).toBe(true);
      expect(roleCanAccessMobileTab("COMERCIAL", "perfil")).toBe(true);
      expect(roleCanAccessMobileTab("SUPERUSER", "perfil")).toBe(false);
    });
  });

  describe("homes e labels", () => {
    it("resolve homes web por perfil e alias", () => {
      expect(getRoleHome("ADMIN")).toBe("/dashboard/admin");
      expect(getRoleHome("GESTOR_FUNDO")).toBe("/dashboard/gestor");
      expect(getRoleHome("ENGENHEIRO")).toBe("/dashboard/engenheiro");
      expect(getRoleHome("PARCEIRO")).toBe("/dashboard/comercial");
      expect(getRoleHome("TOMADOR")).toBe("/dashboard");
    });

    it("resolve homes mobile por perfil", () => {
      expect(getMobileRoleHome("TOMADOR")).toBe("/(tabs)/obras");
      expect(getMobileRoleHome("ENGENHEIRO")).toBe("/(tabs)/engenheiro");
      expect(getMobileRoleHome("GESTOR_OBRA")).toBe("/(tabs)/engenheiro");
      expect(getMobileRoleHome("COMERCIAL")).toBe("/(tabs)/perfil");
      expect(getMobileRoleHome("PARCEIRO")).toBe("/(tabs)/perfil");
    });

    it("mantem labels dos 5 perfis do plano", () => {
      expect(ROLE_LABELS.TOMADOR).toBe("Tomador");
      expect(ROLE_LABELS.ADMIN).toBe("Administrador");
      expect(ROLE_LABELS.GESTOR).toBe("Gestor do Fundo");
      expect(ROLE_LABELS.ENGENHEIRO).toBe("Engenheiro");
      expect(ROLE_LABELS.COMERCIAL).toBe("Comercial");
    });

    it("identifica gestores por alias e canonico", () => {
      expect(isManagerRole("GESTOR")).toBe(true);
      expect(isManagerRole("GESTOR_FUNDO")).toBe(true);
      expect(isManagerRole("ADMIN")).toBe(true);
      expect(isManagerRole("TOMADOR")).toBe(false);
    });
  });
});
