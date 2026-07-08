import assert from "node:assert/strict";
import { isMvpRouteAllowed, BETA_MVP_MODE, GUIDED_STRICT_MODE } from "./beta-mvp";

assert.equal(BETA_MVP_MODE, false);
assert.equal(GUIDED_STRICT_MODE, true);

assert.equal(isMvpRouteAllowed("/dashboard/obras", "GESTOR"), false);
assert.equal(isMvpRouteAllowed("/dashboard/gestor/kyc", "GESTOR"), true); // legacy → /dashboard/gestor
assert.equal(isMvpRouteAllowed("/dashboard/gestor/sub-rota", "GESTOR"), false);

console.log("✅ beta-mvp OK");
