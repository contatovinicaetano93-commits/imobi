import {
  normalizeUserRole,
  isGestorRole,
  isManagerRole,
  MANAGER_ROLES,
  MANAGER_READ_ROLES,
  MANAGER_WRITE_ROLES,
} from "./constants/manager-roles";

describe("RBAC – manager-roles utilities", () => {
  describe("normalizeUserRole", () => {
    it("normalizes GESTOR_FUNDO (legacy) to GESTOR", () => {
      expect(normalizeUserRole("GESTOR_FUNDO")).toBe("GESTOR");
    });

    it("keeps GESTOR unchanged", () => {
      expect(normalizeUserRole("GESTOR")).toBe("GESTOR");
    });

    it("keeps ADMIN unchanged", () => {
      expect(normalizeUserRole("ADMIN")).toBe("ADMIN");
    });

    it("keeps TOMADOR unchanged", () => {
      expect(normalizeUserRole("TOMADOR")).toBe("TOMADOR");
    });

    it("keeps ENGENHEIRO unchanged", () => {
      expect(normalizeUserRole("ENGENHEIRO")).toBe("ENGENHEIRO");
    });

    it("returns null for null input", () => {
      expect(normalizeUserRole(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(normalizeUserRole(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(normalizeUserRole("")).toBeNull();
    });
  });

  describe("isGestorRole", () => {
    it("returns true for GESTOR", () => {
      expect(isGestorRole("GESTOR")).toBe(true);
    });

    it("returns true for GESTOR_FUNDO (legacy alias)", () => {
      expect(isGestorRole("GESTOR_FUNDO")).toBe(true);
    });

    it("returns false for ADMIN", () => {
      expect(isGestorRole("ADMIN")).toBe(false);
    });

    it("returns false for TOMADOR", () => {
      expect(isGestorRole("TOMADOR")).toBe(false);
    });

    it("returns false for ENGENHEIRO", () => {
      expect(isGestorRole("ENGENHEIRO")).toBe(false);
    });

    it("returns false for null", () => {
      expect(isGestorRole(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isGestorRole(undefined)).toBe(false);
    });
  });

  describe("isManagerRole", () => {
    it("returns true for GESTOR", () => {
      expect(isManagerRole("GESTOR")).toBe(true);
    });

    it("returns true for ADMIN", () => {
      expect(isManagerRole("ADMIN")).toBe(true);
    });

    it("returns true for GESTOR_FUNDO (legacy alias)", () => {
      expect(isManagerRole("GESTOR_FUNDO")).toBe(true);
    });

    it("returns false for TOMADOR", () => {
      expect(isManagerRole("TOMADOR")).toBe(false);
    });

    it("returns false for ENGENHEIRO", () => {
      expect(isManagerRole("ENGENHEIRO")).toBe(false);
    });

    it("returns false for COMERCIAL", () => {
      expect(isManagerRole("COMERCIAL")).toBe(false);
    });

    it("returns false for null", () => {
      expect(isManagerRole(null)).toBe(false);
    });
  });

  describe("MANAGER_ROLES constant", () => {
    it("includes GESTOR", () => {
      expect(MANAGER_ROLES).toContain("GESTOR");
    });

    it("includes ADMIN", () => {
      expect(MANAGER_ROLES).toContain("ADMIN");
    });

    it("does not include TOMADOR", () => {
      expect(MANAGER_ROLES).not.toContain("TOMADOR");
    });

    it("does not include ENGENHEIRO", () => {
      expect(MANAGER_ROLES).not.toContain("ENGENHEIRO");
    });

    it("does not include COMERCIAL", () => {
      expect(MANAGER_ROLES).not.toContain("COMERCIAL");
    });
  });

  describe("read/write role parity", () => {
    it("MANAGER_READ_ROLES and MANAGER_WRITE_ROLES are identical (no separate write restriction)", () => {
      expect(MANAGER_READ_ROLES).toEqual(MANAGER_WRITE_ROLES);
    });
  });
});
