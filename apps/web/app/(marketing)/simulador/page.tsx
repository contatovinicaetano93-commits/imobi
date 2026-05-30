"use client";

import { useState } from "react";
import { simuladorApi, type SimuladorResult } from "@/lib/api";

type FormState = {
  valorEmpreendimento: string;
  tipoObra: "TERRENO" | "CONSTRUCAO" | "ACABAMENTO" | "COMPRADOR";
  prazo: number;
  localizacao: string;
};

export default function SimuladorPage() {
  const [form, setForm] = useState<FormState>({
    valorEmpreendimento: "",
    tipoObra: "CONSTRUCAO",
    prazo: 24,
    localizacao: "",
  });
  const [resultado, setResultado] = useState<SimuladorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSimular = async () => {
    if (!form.valorEmpreendimento) {
      setErro("Preencha o valor do empreendimento");
      return;
    }

    setLoading(true);
    setErro(null);
    try {
      const data = await simuladorApi.calcular({
        valorEmpreendimento: Number(form.valorEmpreendimento),
        tipoObra: form.tipoObra,
        prazo: form.prazo,
      });
      setResultado(data);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao simular");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Simule Seu Crédito</h1>
        <p className="text-slate-400 mb-12">
          Veja quanto você pode financiar e em quanto tempo
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Formulário */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-8 space-y-6">
            <div>
              <label className="block text-slate-300 mb-2">Valor do Empreendimento</label>
              <input
                type="number"
                value={form.valorEmpreendimento}
                onChange={(e) => setForm({ ...form, valorEmpreendimento: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500"
                placeholder="R$ 1.000.000"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-2">Tipo de Obra</label>
              <select
                value={form.tipoObra}
                onChange={(e) => setForm({ ...form, tipoObra: e.target.value as FormState["tipoObra"] })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="TERRENO">Terreno</option>
                <option value="CONSTRUCAO">Construção</option>
                <option value="ACABAMENTO">Acabamento</option>
                <option value="COMPRADOR">Financiamento Comprador</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-2">Prazo (meses): {form.prazo}</label>
              <input
                type="range"
                min="6"
                max="36"
                value={form.prazo}
                onChange={(e) => setForm({ ...form, prazo: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-2">Localização</label>
              <input
                type="text"
                value={form.localizacao}
                onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500"
                placeholder="Estado/Cidade"
              />
            </div>

            <button
              onClick={handleSimular}
              disabled={loading}
              className="w-full bg-[#30D158] text-slate-950 font-bold py-3 rounded-lg hover:bg-[#26c443] transition disabled:opacity-50"
            >
              {loading ? "Simulando..." : "Simular Crédito"}
            </button>
            {erro && (
              <div className="bg-red-950/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
                {erro}
              </div>
            )}
          </div>

          {/* Resultado */}
          {resultado && (
            <div className="bg-slate-900 rounded-lg border border-[#30D158]/50 p-8 space-y-4">
              <h2 className="text-2xl font-bold text-[#30D158] mb-6">Seu Resultado</h2>

              <div className="bg-slate-800 p-4 rounded-lg">
                <p className="text-slate-400 text-sm">Valor Máximo Financiável</p>
                <p className="text-3xl font-bold text-[#30D158]">
                  R$ {(resultado.valorMaximoFinanciavel / 1000).toFixed(1)}k
                </p>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <p className="text-slate-400 text-sm">Parcela Média Mensal</p>
                <p className="text-2xl font-bold text-white">
                  R$ {(resultado.parcelaMedia / 1000).toFixed(1)}k
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg">
                  <p className="text-slate-400 text-xs">Taxa a.a.</p>
                  <p className="text-xl font-bold text-[#0052CC]">{resultado.taxaAno}%</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg">
                  <p className="text-slate-400 text-xs">LTV</p>
                  <p className="text-xl font-bold text-[#0052CC]">{resultado.ltv}%</p>
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg border border-yellow-500/30">
                <p className="text-slate-400 text-sm">Total de Juros</p>
                <p className="text-xl font-bold text-yellow-400">
                  R$ {(resultado.totalJuros / 1000).toFixed(1)}k
                </p>
              </div>

              <button className="w-full bg-[#30D158] text-slate-950 font-bold py-3 rounded-lg hover:bg-[#26c443] transition mt-6">
                Prosseguir para KYC
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
