import assert from "node:assert/strict";
import { Home, HardHat, FileCheck2, Calculator, User } from "lucide-react";
import { buildMobileTabs, isMobileTabActive } from "./mobile-nav";

const nav = [
  { label: "Minha jornada", href: "/dashboard/construtor", icon: Home, section: "geral" },
  { label: "Documentos (KYC)", href: "/dashboard/kyc", icon: FileCheck2, section: "operacao" },
  { label: "Viabilidade", href: "/dashboard/proposta-credito", icon: Calculator, section: "operacao" },
  { label: "Minha operação", href: "/dashboard/operacao", icon: HardHat, section: "operacao" },
  { label: "Perfil", href: "/dashboard/perfil", icon: User, section: "conta" },
];

const { tabs, drawerItems } = buildMobileTabs(nav);
assert.equal(tabs.length, 5);
assert.equal(tabs[4]?.isMenu, true);
assert.equal(tabs[0]?.shortLabel, "Início");
assert.equal(drawerItems.length, 5);

assert.equal(isMobileTabActive("/dashboard/kyc", "/dashboard/kyc", "/dashboard/kyc"), true);
assert.equal(isMobileTabActive("/dashboard/kyc/upload", "/dashboard/kyc", "/dashboard/kyc"), true);
assert.equal(isMobileTabActive("/dashboard/construtor", "/dashboard/kyc", "/dashboard/construtor"), false);

console.log("✅ mobile-nav OK");
