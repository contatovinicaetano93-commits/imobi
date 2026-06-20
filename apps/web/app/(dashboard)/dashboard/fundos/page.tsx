import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ObraResumo, CreditoResumo } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { normalizeRole } from "@/lib/role-permissions";
import { fetchApiWithRetry } from "@/lib/fetch-api-with-retry";
import { readApiErrorMessage } from "@/lib/read-api-error";
import { PortfolioChart } from "./_components/PortfolioChart";
import { RegionalDistribution } from "./_components/RegionalDistribution";
import { InadimplenciaMetrics } from "./_components/InadimplenciaMetrics";
import { ReportExport } from "./_components/ReportExport";
import { CapitalFundoAdmin } from "./_components/CapitalFundoAdmin";
import {
  aggregateByRegion,
  calculateRoiTimeline,
  calculateInadimplenciaRate,
} from "./_components/fundos-utils";

export const dynamic = 'force-dynamic';

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
    0
  );

  const obrasProgresso = obras.filter(
    (o) => ["EM_ANDAMENTO", "EM_EXECUCAO", "PLANEJADA", "PLANEJAMENTO"].includes(o.status)
  );

  const creditoTotalAprovado = creditos.reduce(
    (acc, c) => acc + Number(c.valorAprovado ?? 0),
    0
  );
  const totalEtapas = obras.flatMap((o) => o.etapas ?? []);
  const etapasAprovadas = totalEtapas.filter((e) => e.status === "APROVADA");
  const etapasAguardandoVistoria = totalEtapas.filter(
    (e) => e.status === "AGUARDANDO_VISTORIA"
  );

  const roiEsperado = creditoTotalAprovado * 0.15;
  const inadimplenciaRate = 0;

  const regionalMetrics = aggregateByRegion(obras, creditos);
  const roiTimeline = calculateRoiTimeline(creditos);
  const inadimplenciaData = calculateInadimplenciaRate(creditos);

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Carteira do Fundo</h1>
          <p className="text-sm text-gray-500 mt-1">Visão consolidada da operação</p>
        </div>
      </div>

      {portfolioError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
          {portfolioError}
          {" "}
          Faça logout/login. Se persistir, redeploy a API no Render (commit recente).
        </div>
      )}

      {isAdmin && <CapitalFundoAdmin />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Total desembolsado</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatarBRL(totalDesembolsado)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            de {formatarBRL(creditoTotalAprovado)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Obras em progresso</p>
          <p className="text-2xl font-bold text-gray-900">{obrasProgresso.length}</p>
          <p className="text-xs text-gray-400 mt-1">{obras.length} no total</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Etapas completadas</p>
          <p className="text-2xl font-bold text-gray-900">
            {etapasAprovadas.length} / {totalEtapas.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {totalEtapas.length
              ? `${Math.round((etapasAprovadas.length / totalEtapas.length) * 100)}%`
              : "—"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Inadimplência</p>
          <p className="text-2xl font-bold text-gray-900">{inadimplenciaRate}%</p>
          <p className="text-xs text-gray-400 mt-1">taxa de não pagamento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ROI Esperado</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500 mb-1">Retorno anual estimado</p>
              <p className="text-2xl font-bold text-green-600">
                {formatarBRL(roiEsperado)}
              </p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: "100%" }} />
            </div>
            <p className="text-xs text-gray-400">Baseado em 15% de retorno anual</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Etapas aguardando vistoria
          </h2>
          <div className="space-y-3">
            <p className="text-2xl font-bold text-orange-600">
              {etapasAguardandoVistoria.length}
            </p>
            <p className="text-sm text-gray-500">
              etapas prontas para validação técnica
            </p>
            <a
              href="/dashboard/gestor/etapas"
              className="inline-block text-sm text-[#1B4FD8] font-medium hover:text-[#1638a8]"
            >
              Ver fila →
            </a>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolução de ROI</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <PortfolioChart data={roiTimeline} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Taxa de Inadimplência</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <InadimplenciaMetrics data={inadimplenciaData} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por região</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {regionalMetrics.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhuma obra em progresso.</p>
          ) : (
            <RegionalDistribution data={regionalMetrics} />
          )}
        </div>
      </section>

      <section>
        <ReportExport
          regional={regionalMetrics}
          roiData={roiTimeline}
          inadimplenciaData={inadimplenciaData}
          creditos={creditos}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Linhas de crédito</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {creditos.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-gray-400 text-sm">Nenhuma linha de crédito ativa.</p>
            </div>
          ) : (
            creditos.map((credito) => (
              <div
                key={credito.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Crédito #{credito.id.slice(0, 8)}</h3>
                  <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                    {credito.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Aprovado:</span>
                    <span className="font-medium text-gray-900">
                      {formatarBRL(Number(credito.valorAprovado))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Liberado:</span>
                    <span className="font-medium text-gray-900">
                      {formatarBRL(Number(credito.valorLiberado))}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
