import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

function createContext(userRole: string | null | undefined): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: userRole ? { tipo: userRole } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

function createGuard(requiredRoles: string[] | undefined) {
  const reflector = {
    getAllAndOverride: jest.fn(() => requiredRoles),
  } as unknown as Reflector;

  return new RolesGuard(reflector);
}

describe("RolesGuard", () => {
  it("permite acesso quando o endpoint nao declara roles", () => {
    const guard = createGuard(undefined);

    expect(guard.canActivate(createContext("TOMADOR"))).toBe(true);
  });

  it("permite role canonico exigido pelo endpoint", () => {
    const guard = createGuard(["ENGENHEIRO", "GESTOR_OBRA", "ADMIN"]);

    expect(guard.canActivate(createContext("ENGENHEIRO"))).toBe(true);
  });

  it("normaliza GESTOR_FUNDO e permite acesso a endpoints de GESTOR", () => {
    const guard = createGuard(["GESTOR", "ADMIN"]);

    expect(guard.canActivate(createContext("GESTOR_FUNDO"))).toBe(true);
  });

  it("permite PARCEIRO em endpoints comerciais compartilhados", () => {
    const guard = createGuard(["COMERCIAL", "PARCEIRO", "ADMIN"]);

    expect(guard.canActivate(createContext("PARCEIRO"))).toBe(true);
  });

  it("permite GESTOR_OBRA em endpoints de engenharia", () => {
    const guard = createGuard(["ENGENHEIRO", "GESTOR_OBRA", "ADMIN"]);

    expect(guard.canActivate(createContext("GESTOR_OBRA"))).toBe(true);
  });

  it("bloqueia TOMADOR em endpoints de gestor do fundo", () => {
    const guard = createGuard(["GESTOR", "ADMIN"]);

    expect(() => guard.canActivate(createContext("TOMADOR"))).toThrow(ForbiddenException);
  });

  it("bloqueia COMERCIAL em endpoints de engenharia", () => {
    const guard = createGuard(["ENGENHEIRO", "GESTOR_OBRA", "ADMIN"]);

    expect(() => guard.canActivate(createContext("COMERCIAL"))).toThrow(ForbiddenException);
  });

  it("bloqueia requests autenticados sem role reconhecido", () => {
    const guard = createGuard(["ADMIN"]);

    expect(() => guard.canActivate(createContext("SUPERUSER"))).toThrow(ForbiddenException);
  });

  it("bloqueia requests sem usuario", () => {
    const guard = createGuard(["ADMIN"]);

    expect(() => guard.canActivate(createContext(null))).toThrow(ForbiddenException);
  });
});
