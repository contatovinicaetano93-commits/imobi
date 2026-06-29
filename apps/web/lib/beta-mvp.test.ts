import assert from "node:assert/strict";
import { isMvpRouteAllowed, mvpSafeHref, BETA_MVP_MODE, GUIDED_STRICT_MODE } from "./beta-mvp";

assert.equal(BETA_MVP_MODE, false);
assert.equal(GUIDED_STRICT_MODE, true);

assert.equal(mvpSafeHref("/dashboard/credito", "GESTOR"), "/dashboard/credito");
assert.equal(mvpSafeHref("/dashboard/kyc", "TOMADOR"), "/dashboard/kyc");
assert.equal(isMvpRouteAllowed("/dashboard/obras", "GESTOR"), false);
assert.equal(isMvpRouteAllowed("/dashboard/gestor/kyc", "GESTOR"), true); // legacy → /dashboard/gestor
assert.equal(isMvpRouteAllowed("/dashboard/gestor/sub-rota", "GESTOR"), false);

console.log("✅ beta-mvp OK");
