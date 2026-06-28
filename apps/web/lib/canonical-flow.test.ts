import assert from "node:assert/strict";
import {
  getCanonicalNav,
  isCanonicalRouteAllowed,
  resolveLegacyRedirect,
} from "./canonical-flow";

assert.equal(resolveLegacyRedirect("/dashboard/score"), "/dashboard/construtor");
assert.equal(resolveLegacyRedirect("/dashboard/fundos"), "/dashboard/gestor");

assert.equal(
  isCanonicalRouteAllowed("/dashboard/construtor", "TOMADOR"),
  true,
);
assert.equal(
  isCanonicalRouteAllowed("/dashboard/score", "TOMADOR"),
  false,
);
assert.equal(
  isCanonicalRouteAllowed("/dashboard/admin", "ADMIN"),
  true,
);

const tomadorNav = getCanonicalNav("TOMADOR");
assert.ok(tomadorNav.some((n) => n.href === "/dashboard/construtor"));
assert.ok(!tomadorNav.some((n) => n.href === "/dashboard/score"));

console.log("canonical-flow.test.ts OK");
