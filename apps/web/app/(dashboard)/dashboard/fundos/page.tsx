import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ObraResumo, CreditoResumo } from "@/lib/api";
import { normalizeRole } from "@/lib/role-permissions";
import { fetchApiWithRetry } from "@/lib/fetch-api-with-retry";
import { readApiErrorMessage } from "@/lib/read-api-error";
import { FundosPageClient } from "./_components/FundosPageClient";
import {
  aggregateByRegion,
  calculateRoiTimeline,
  calculateInadimplenciaRate,
} from "./_components/fundos-utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Carteira — Gestor do Fundo" };

function decodeRole(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    return normalizeRole(typeof decoded.role === "string" ? decoded.role : null);
  } catch {
    return null;
  }
}

async function loadPortfolio(
  role: string | null,
  token: string | undefined,
): Promise<{
  obras: ObraResumo[];
  creditos: CreditoResumo[];
  error?: string;
}> {
  if (role !== "GESTOR" && role !== "ADMIN") {
    return { obras: [], creditos: [] };
  }

  const res = await fetchApiWithRetry({
    path: "/manager/carteira",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    maxAttemptsPerApi: 6,
  });

  if (!res) {
    return {
      obras: [],
      creditos: [],
      error: "API indisponível. Aguarde 1–2 minutos e recarregue a página.",
    };
  }

  if (!res.ok) {
    const msg = await readApiErrorMessage(res, "Erro ao carregar carteira do fundo");
    return { obras: [], creditos: [], error: msg };
  }

  const data = (await res.json().catch(() => null)) as {
    obras?: ObraResumo[];
    creditos?: CreditoResumo[];
  } | null;

  return {
    obras: Array.isArray(data?.obras) ? data.obras : [],
    creditos: Array.isArray(data?.creditos) ? data.creditos : [],
  };
}

export default async function FundosPage() {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  const role = decodeRole(token);
  const isAdmin = role === "ADMIN";

  const { obras, creditos, error: portfolioError } = await loadPortfolio(role, token);

  const totalDesembolsado = creditos.reduce(
    (acc, c) => acc + Number(c.valorLiberado ?? 0),
    0,
  );

  const obrasProgresso = obras.filter((o) =>
    ["EM_ANDAMENTO", "EM_EXECUCAO", "PLANEJADA", "PLANEJAMENTO"].includes(o.status),
  );

  const creditoTotalAprovado = creditos.reduce(
    (acc, c) => acc + Number(c.valorAprovado ?? 0),
    0,
  );
  const totalEtapas = obras.flatMap((o) => o.etapas ?? []);
  const etapasAprovadas = totalEtapas.filter((e) => e.status === "APROVADA");
  const etapasAguardandoVistoria = totalEtapas.filter(
    (e) => e.status === "AGUARDANDO_VISTORIA",
  );

  const roiEsperado = creditoTotalAprovado * 0.15;
  const inadimplenciaRate = 0;

  const regionalMetrics = aggregateByRegion(obras, creditos);
  const roiTimeline = calculateRoiTimeline(creditos);
  const inadimplenciaData = calculateInadimplenciaRate(creditos);

  return (
    <FundosPageClient
      isAdmin={isAdmin}
      portfolioError={portfolioError}
      obras={obras}
      creditos={creditos}
      totalDesembolsado={totalDesembolsado}
      creditoTotalAprovado={creditoTotalAprovado}
      obrasProgressoCount={obrasProgresso.length}
      etapasAprovadasCount={etapasAprovadas.length}
      totalEtapasCount={totalEtapas.length}
      inadimplenciaRate={inadimplenciaRate}
      roiEsperado={roiEsperado}
      etapasAguardandoVistoriaCount={etapasAguardandoVistoria.length}
      regionalMetrics={regionalMetrics}
      roiTimeline={roiTimeline}
      inadimplenciaData={inadimplenciaData}
    />
  );
}
