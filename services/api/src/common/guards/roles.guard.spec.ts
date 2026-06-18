import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

function makeCtx(userTipo: string | null | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: userTipo !== undefined ? { tipo: userTipo } : null,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  let reflector: jest.Mocked<Pick<Reflector, "getAllAndOverride">>;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it("allows access when no roles metadata is set", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeCtx("TOMADOR"))).toBe(true);
  });

  it("allows access when roles array is empty", () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(makeCtx("TOMADOR"))).toBe(true);
  });

  it("allows ADMIN to access ADMIN-only route", () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    expect(guard.canActivate(makeCtx("ADMIN"))).toBe(true);
  });

  it("allows GESTOR to access GESTOR/ADMIN route", () => {
    reflector.getAllAndOverride.mockReturnValue(["GESTOR", "ADMIN"]);
    expect(guard.canActivate(makeCtx("GESTOR"))).toBe(true);
  });

  it("allows ENGENHEIRO to access multi-role route that includes ENGENHEIRO", () => {
    reflector.getAllAndOverride.mockReturnValue(["GESTOR", "ADMIN", "ENGENHEIRO"]);
    expect(guard.canActivate(makeCtx("ENGENHEIRO"))).toBe(true);
  });

  it("allows ADMIN to access GESTOR/ADMIN route", () => {
    reflector.getAllAndOverride.mockReturnValue(["GESTOR", "ADMIN"]);
    expect(guard.canActivate(makeCtx("ADMIN"))).toBe(true);
  });

  it("handles legacy GESTOR_FUNDO alias as GESTOR", () => {
    reflector.getAllAndOverride.mockReturnValue(["GESTOR", "ADMIN"]);
    expect(guard.canActivate(makeCtx("GESTOR_FUNDO"))).toBe(true);
  });

  it("throws ForbiddenException when TOMADOR accesses ADMIN-only route", () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    expect(() => guard.canActivate(makeCtx("TOMADOR"))).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when ENGENHEIRO accesses GESTOR/ADMIN route", () => {
    reflector.getAllAndOverride.mockReturnValue(["GESTOR", "ADMIN"]);
    expect(() => guard.canActivate(makeCtx("ENGENHEIRO"))).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when COMERCIAL accesses ADMIN-only route", () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    expect(() => guard.canActivate(makeCtx("COMERCIAL"))).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when user has no role (null tipo)", () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    expect(() => guard.canActivate(makeCtx(null))).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when user is unauthenticated (no user object)", () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("error message mentions 'Acesso negado'", () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    try {
      guard.canActivate(makeCtx("TOMADOR"));
      fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
      expect((e as ForbiddenException).message).toContain("Acesso negado");
    }
  });
});
