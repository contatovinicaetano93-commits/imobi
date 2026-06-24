import assert from "node:assert/strict";
import { isMvpRouteAllowed, mvpSafeHref, BETA_MVP_MODE } from "./beta-mvp";

assert.equal(BETA_MVP_MODE, true);

assert.equal(mvpSafeHref("/dashboard/credito", "GESTOR"), "/dashboard/gestor");
assert.equal(mvpSafeHref("/dashboard/gestor/etapas", "GESTOR"), "/dashboard/gestor/etapas");
assert.equal(mvpSafeHref("/dashboard/kyc", "TOMADOR"), "/dashboard/kyc");
assert.equal(isMvpRouteAllowed("/dashboard/obras", "GESTOR"), true);

console.log("✅ beta-mvp OK");
