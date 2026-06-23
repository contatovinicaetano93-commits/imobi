"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { obrasApi, fluxoApi, type FluxoStatus } from "@/lib/api";
import { FlowGateBanner } from "@/components/FlowGateBanner";
import { proximoPassoFluxo } from "@/lib/flow-gates";
import { TOMADOR_HOME } from "@/lib/tomador-flow";

type FormState = {
  nome: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  latitude: string;
  longitude: string;
  raioValidacaoMetros: string;
  areaM2: string;
  dataConclusaoPrevistaISO: string;
};

export default function NovaObraPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const retornoInicio = searchParams?.get("retorno") === "inicio";
  const voltarHref = retornoInicio ? TOMADOR_HOME : "/dashboard/obras";
  const [fluxo, setFluxo] = useState<FluxoStatus | null>(null);

  useEffect(() => {
    fluxoApi.status().then(setFluxo).catch(() => null);
  }, []);

  const [form, setForm] = useState<FormState>({
    nome: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    cep: "",
    latitude: "",
    longitude: "",
    raioValidacaoMetros: "80",
    areaM2: "",
    dataConclusaoPrevistaISO: "",
  });
  const [loading, setLoading] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function usarLocalizacao() {
    if (!navigator.geolocation) {
      setErro("Geolocalização não suportada neste navegador.");
      return;
    }
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", String(pos.coords.latitude));
        set("longitude", String(pos.coords.longitude));
        setLocalizando(false);
      },
      () => {
        setErro("Não foi possível obter a localização. Verifique as permissões do navegador.");
        setLocalizando(false);
      }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const cepLimpo = form.cep.replace(/\D/g, "");
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    const area = parseFloat(form.areaM2);
    const raio = parseInt(form.raioValidacaoMetros, 10);

    if (!form.nome.trim()) { setErro("Nome da obra é obrigatório."); return; }
    if (!form.logradouro.trim()) { setErro("Logradouro é obrigatório."); return; }
    if (!form.numero.trim()) { setErro("Número é obrigatório."); return; }
    if (!form.bairro.trim()) { setErro("Bairro é obrigatório."); return; }
    if (!form.cidade.trim()) { setErro("Cidade é obrigatória."); return; }
    if (form.uf.trim().length !== 2) { setErro("UF deve ter 2 letras."); return; }
    if (cepLimpo.length !== 8) { setErro("CEP inválido (8 dígitos)."); return; }
    if (isNaN(lat) || lat < -90 || lat > 90) { setErro("Latitude inválida."); return; }
    if (isNaN(lng) || lng < -180 || lng > 180) { setErro("Longitude inválida."); return; }
    if (isNaN(area) || area <= 0) { setErro("Área em m² inválida."); return; }
    if (!form.dataConclusaoPrevistaISO) { setErro("Data prevista de conclusão é obrigatória."); return; }

    setLoading(true);
    try {
      const nova = await obrasApi.criar({
        nome: form.nome.trim(),
        endereco: {
          logradouro: form.logradouro.trim(),
          numero: form.numero.trim(),
          complemento: form.complemento.trim() || undefined,
          bairro: form.bairro.trim(),
          cidade: form.cidade.trim(),
          uf: form.uf.trim().toUpperCase(),
          cep: cepLimpo,
        },
        geo: {
          latitude: lat,
          longitude: lng,
          raioValidacaoMetros: isNaN(raio) ? 80 : raio,
        },
        areaM2: area,
        dataConclusaoPrevistaISO: new Date(`${form.dataConclusaoPrevistaISO}T00:00:00`).toISOString(),
      });
      router.push(`/dashboard/obras/${nova.obraId}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar obra.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50 text-sm";
  const labelCls = "block text-sm font-semibold text-gray-900 mb-2";

  const gate = proximoPassoFluxo(fluxo);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <button
          onClick={() => router.push(voltarHref)}
          className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-800"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Jost', sans-serif" }}
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        {retornoInicio && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#1B4FD8]">Passo 2 de 4</p>
        )}
        <h1 className="text-2xl font-bold text-gray-900">Nova Obra</h1>
        <p className="text-sm text-gray-500 mt-1">Cada nova obra exige documentos próprios e aprovação de comitê.</p>
      </div>

      {gate && <FlowGateBanner {...gate} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={!!gate || loading} className="space-y-6 disabled:opacity-60">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Identificação</h2>

          <div>
            <label className={labelCls}>Nome da obra</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              disabled={loading}
              placeholder="Ex: Residência Silva — Bloco A"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Área (m²)</label>
              <input
                type="number"
                value={form.areaM2}
                onChange={(e) => set("areaM2", e.target.value)}
                disabled={loading}
                placeholder="120"
                min="1"
                step="0.01"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Previsão de conclusão</label>
              <input
                type="date"
                value={form.dataConclusaoPrevistaISO}
                onChange={(e) => set("dataConclusaoPrevistaISO", e.target.value)}
                disabled={loading}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Endereço</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Logradouro</label>
              <input
                type="text"
                value={form.logradouro}
                onChange={(e) => set("logradouro", e.target.value)}
                disabled={loading}
                placeholder="Rua das Flores"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Número</label>
              <input
                type="text"
                value={form.numero}
                onChange={(e) => set("numero", e.target.value)}
                disabled={loading}
                placeholder="123"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Complemento <span className="font-normal text-gray-400">(opcional)</span></label>
            <input
              type="text"
              value={form.complemento}
              onChange={(e) => set("complemento", e.target.value)}
              disabled={loading}
              placeholder="Apto 4, Bloco B"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Bairro</label>
            <input
              type="text"
              value={form.bairro}
              onChange={(e) => set("bairro", e.target.value)}
              disabled={loading}
              placeholder="Centro"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Cidade</label>
              <input
                type="text"
                value={form.cidade}
                onChange={(e) => set("cidade", e.target.value)}
                disabled={loading}
                placeholder="São Paulo"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>UF</label>
              <input
                type="text"
                value={form.uf}
                onChange={(e) => set("uf", e.target.value.toUpperCase().slice(0, 2))}
                disabled={loading}
                placeholder="SP"
                maxLength={2}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>CEP</label>
            <input
              type="text"
              value={form.cep}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                const fmt = v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v;
                set("cep", fmt);
              }}
              disabled={loading}
              placeholder="01310-100"
              className={inputCls}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Coordenadas GPS</h2>
            <button
              type="button"
              onClick={usarLocalizacao}
              disabled={loading || localizando}
              className="text-sm font-semibold text-[#1B4FD8] hover:text-blue-800 disabled:opacity-50 transition-colors"
            >
              {localizando ? "Obtendo localização..." : "Usar minha localização"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Latitude</label>
              <input
                type="number"
                value={form.latitude}
                onChange={(e) => set("latitude", e.target.value)}
                disabled={loading}
                placeholder="-23.550520"
                step="any"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Longitude</label>
              <input
                type="number"
                value={form.longitude}
                onChange={(e) => set("longitude", e.target.value)}
                disabled={loading}
                placeholder="-46.633308"
                step="any"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Raio de validação (metros)</label>
            <input
              type="number"
              value={form.raioValidacaoMetros}
              onChange={(e) => set("raioValidacaoMetros", e.target.value)}
              disabled={loading}
              placeholder="80"
              min="20"
              max="500"
              step="1"
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">Distância máxima aceita para validação de evidências (20–500 m).</p>
          </div>
        </div>
        </fieldset>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        )}

        <div className="flex gap-3">
          <a
            href="/dashboard/obras"
            className="flex-1 text-center border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Cancelar
          </a>
          <button
            type="submit"
            disabled={loading || !!gate}
            className="flex-1 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-colors text-sm"
            style={{ background: "#1B4FD8" }}
          >
            {loading ? "Criando obra..." : "Criar Obra"}
          </button>
        </div>
      </form>
    </div>
  );
}
