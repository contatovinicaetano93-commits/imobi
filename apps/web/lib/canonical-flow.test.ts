import assert from "node:assert/strict";
import {
  getCanonicalNav,
  isCanonicalRouteAllowed,
  resolveLegacyRedirect,
} from "./canonical-flow";

assert.equal(resolveLegacyRedirect("/dashboard/score"), "/dashboard/construtor");
assert.equal(resolveLegacyRedirect("/dashboard/fundos"), "/dashboard/gestor");
assert.equal(resolveLegacyRedirect("/dashboard/gestor/due-diligence/nova"), "/dashboard/gestor");
assert.equal(resolveLegacyRedirect("/dashboard/gestor/kyc"), "/dashboard/gestor");
assert.equal(resolveLegacyRedirect("/dashboard/gestor/etapas/abc"), "/dashboard/gestor");
assert.equal(resolveLegacyRedirect("/dashboard/comite/solicitar"), "/dashboard/credito/solicitar");

const adminNav = getCanonicalNav("ADMIN");
assert.equal(adminNav.filter((n) => n.section !== "conta").length, 2);
assert.ok(adminNav.some((n) => n.href === "/dashboard/admin"));
assert.ok(adminNav.some((n) => n.href === "/dashboard/admin/usuarios"));
assert.ok(!adminNav.some((n) => n.href === "/dashboard/admin/kyc"));

const gestorNav = getCanonicalNav("GESTOR");
assert.equal(gestorNav.filter((n) => n.section !== "conta").length, 1);
assert.ok(gestorNav.some((n) => n.href === "/dashboard/gestor"));

const engNav = getCanonicalNav("ENGENHEIRO");
assert.equal(engNav.filter((n) => n.section !== "conta").length, 2);
assert.ok(!engNav.some((n) => n.href === "/dashboard/obras"));

assert.equal(
  isCanonicalRouteAllowed("/dashboard/construtor", "TOMADOR"),
  true,
);
assert.equal(
  isCanonicalRouteAllowed("/dashboard/score", "TOMADOR"),
  true,
);
assert.equal(
  isCanonicalRouteAllowed("/dashboard/admin", "TOMADOR"),
  false,
);
assert.equal(
  isCanonicalRouteAllowed("/dashboard/admin/pagamentos", "ADMIN"),
  true,
);
assert.equal(
  isCanonicalRouteAllowed("/dashboard/admin", "ADMIN"),
  true,
);
assert.equal(isCanonicalRouteAllowed("/dashboard/comercial/leads", "COMERCIAL"), false);
assert.equal(isCanonicalRouteAllowed("/dashboard/comercial", "COMERCIAL"), true);

const tomadorNav = getCanonicalNav("TOMADOR");
assert.ok(tomadorNav.some((n) => n.href === "/dashboard/construtor"));
assert.ok(!tomadorNav.some((n) => n.href === "/dashboard/score"));
// Obras e Crédito foram unificados em "Minha operação" no menu.
assert.ok(tomadorNav.some((n) => n.href === "/dashboard/operacao"));
assert.ok(!tomadorNav.some((n) => n.href === "/dashboard/obras"));
assert.ok(!tomadorNav.some((n) => n.href === "/dashboard/credito"));
// Mas as rotas de detalhe continuam acessíveis para o tomador.
assert.equal(isCanonicalRouteAllowed("/dashboard/operacao", "TOMADOR"), true);
assert.equal(isCanonicalRouteAllowed("/dashboard/obras/abc", "TOMADOR"), true);
assert.equal(isCanonicalRouteAllowed("/dashboard/credito/solicitar", "TOMADOR"), true);

console.log("canonical-flow.test.ts OK");
