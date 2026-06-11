"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Plus, ChevronRight, FileSpreadsheet } from "lucide-react";
import { dossiesApi, type DossieResumo } from "@/lib/api";
import { DossieStatusBadge } from "@/components/dossie/shared";
import { fmtDataHora } from "@/components/dossie/dossie-utils";
import { DOSSIE_WIZARD_TOTAL_ETAPAS } from "@imbobi/schemas";

export default function DossiesPage() {
  const router = useRouter();
  const [dossies, setDossies] = useState<DossieResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [mostrarNovo, setMostrarNovo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setDossies(await dossiesApi.listar());
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar dossiês");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function criar() {
    if (novoNome.trim().length < 3) {
      setErro("Informe o nome do empreendimento (mínimo 3 caracteres).");
      return;
    }
    setCriando(true);
    setErro(null);
    try {
      const dossie = await dossiesApi.criar({ nomeEmpreendimento: novoNome.trim() });
      router.push(`/dashboard/dossies/${dossie.dossieId}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar dossiê");
      setCriando(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <FolderOpen className="w-6 h-6 text-[#1B4FD8]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dossiês de Crédito</h1>
            <p className="text-sm text-gray-500">
              Coleta guiada de documentos do empreendimento para análise de crédito
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMostrarNovo((v) => !v)}
          className="inline-flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-colors"
          style={{ background: "#1B4FD8" }}
        >
          <Plus className="w-4 h-4" /> Novo Dossiê
        </button>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-700 mb-6">
          {erro}
        </div>
      )}

      {mostrarNovo && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-900 mb-1.5">
              Nome do empreendimento
            </label>
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void criar()}
              placeholder="Ex.: Residencial Vista do Vale"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => void criar()}
            disabled={criando}
            className="text-white font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50 hover:opacity-90"
            style={{ background: "#1B4FD8" }}
          >
            {criando ? "Criando..." : "Criar e preencher"}
          </button>
        </div>
      )}

      {carregando ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-sm text-gray-400">
          Carregando dossiês...
        </div>
      ) : dossies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center gap-4">
          <div className="p-5 bg-gray-50 rounded-2xl">
            <FileSpreadsheet className="w-12 h-12 text-gray-300" />
          </div>
          <p className="text-gray-900 font-semibold">Nenhum dossiê ainda</p>
          <p className="text-sm text-gray-500 max-w-md text-center">
            O dossiê substitui a planilha de viabilidade: um passo a passo guiado com ficha do
            empreendimento, unidades, recebíveis, documentos e envio para análise.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {dossies.map((d) => {
            const pct = Math.round(
              ((d.etapasConcluidas?.length ?? 0) / DOSSIE_WIZARD_TOTAL_ETAPAS) * 100
            );
            return (
              <button
                key={d.dossieId}
                type="button"
                onClick={() => router.push(`/dashboard/dossies/${d.dossieId}`)}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{d.nomeEmpreendimento}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {d.speRazaoSocial ?? "SPE não informada"} · atualizado em {fmtDataHora(d.atualizadoEm)}
                  </p>
                </div>
                <div className="w-36 shrink-0">
                  <div className="flex items-center justify-between text-[0.65rem] text-gray-500 mb-1">
                    <span>Completude</span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: "#1B4FD8" }}
                    />
                  </div>
                </div>
                <DossieStatusBadge status={d.status} />
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
