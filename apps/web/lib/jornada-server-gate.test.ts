import assert from "node:assert/strict";
import type { Jornada } from "@/lib/api";
import { isJornadaPathAllowed } from "./jornada-routes";
import { jornadaGateDecision } from "./jornada-server-gate";

function j(
  partial: Partial<Jornada> & Pick<Jornada, "perfil" | "passoAtual" | "href">,
): Jornada {
  return {
    titulo: "t",
    descricao: "d",
    concluido: false,
    passosConcluidos: 0,
    totalPassos: 5,
    progressoPct: 0,
    ...partial,
  };
}

const jornadas: Jornada[] = [
  j({ perfil: "tomador", passoAtual: "kyc", href: "/dashboard/kyc" }),
  j({ perfil: "tomador", passoAtual: "viabilidade", href: "/dashboard/proposta-credito" }),
  j({ perfil: "tomador", passoAtual: "obra", href: "/dashboard/obras/nova" }),
  j({ perfil: "tomador", passoAtual: "credito", href: "/dashboard/credito" }),
  j({ perfil: "tomador", passoAtual: "aguardando", href: "/dashboard/construtor" }),
  j({ perfil: "tomador", passoAtual: "acompanhar", href: "/dashboard/construtor" }),
  j({ perfil: "tomador", passoAtual: "concluido", href: "/dashboard/construtor" }),
];

const paths = [
  "/dashboard/construtor",
  "/dashboard/kyc",
  "/dashboard/proposta-credito",
  "/dashboard/viabilidade",
  "/dashboard/obras",
  "/dashboard/obras/nova",
  "/dashboard/operacao",
  "/dashboard/credito",
  "/dashboard/credito/solicitar",
  "/dashboard/perfil",
  "/dashboard/notificacoes",
];

// 1) Equivalência: para tomador/construtor guiado, a decisão do gate server
//    reflete exatamente isJornadaPathAllowed (mesma função, sem divergência).
for (const jornada of jornadas) {
  for (const path of paths) {
    for (const role of ["TOMADOR", "CONSTRUTOR"]) {
      const expected = isJornadaPathAllowed(path, jornada) ? null : jornada.href;
      const actual = jornadaGateDecision(path, role, jornada);
      assert.equal(
        actual,
        expected,
        `divergência em ${role} ${jornada.passoAtual} ${path}`,
      );
    }
  }
}

// 2) Roles não guiados (o JornadaGuard client também não age) → nunca redireciona.
for (const role of ["ADMIN", "GESTOR", "ENGENHEIRO", "COMERCIAL", null]) {
  assert.equal(jornadaGateDecision("/dashboard/obras", role, jornadas[0]), null);
}

// 3) Fora do dashboard ou sem jornada → sem decisão.
assert.equal(jornadaGateDecision("/login", "TOMADOR", jornadas[0]), null);
assert.equal(jornadaGateDecision(null, "TOMADOR", jornadas[0]), null);
assert.equal(jornadaGateDecision("/dashboard/kyc", "TOMADOR", null), null);

// 4) Caso concreto de deep-link: passo kyc tentando abrir obras → redireciona pro href.
assert.equal(
  jornadaGateDecision("/dashboard/obras", "TOMADOR", jornadas[0]),
  "/dashboard/kyc",
);

console.log("✅ jornada-server-gate OK");
