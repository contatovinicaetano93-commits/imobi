"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { comercialApi, LeadFonte, LeadTipoObra, LeadSegmentoCliente } from "@/lib/api";

type FormState = {
  clienteNome: string;
  clienteEmail: string;
  clienteTelefone: string;
  fonte: LeadFonte | "";
  tipoObra: LeadTipoObra | "";
  segmentoCliente: LeadSegmentoCliente | "";
};

const FONTES: { value: LeadFonte; label: string }[] = [
  { value: "INDICACAO", label: "Indicação" },
  { value: "WEBSITE", label: "Site" },
  { value: "MARKETPLACE", label: "Marketplace" },
  { value: "CAMPANHA_DIGITAL", label: "Campanha Digital" },
  { value: "OFFLINE", label: "Offline" },
  { value: "PARCEIRO", label: "Parceiro" },
];

const TIPOS_OBRA: { value: LeadTipoObra; label: string }[] = [
  { value: "residencial", label: "Residencial" },
  { value: "comercial", label: "Comercial" },
  { value: "industrial", label: "Industrial" },
  { value: "reforma", label: "Reforma" },
];

const SEGMENTOS: { value: LeadSegmentoCliente; label: string }[] = [
  { value: "NOVO", label: "Novo" },
  { value: "RETORNO", label: "Retorno" },
  { value: "CONCORRENTE", label: "Concorrente" },
];

function formatTelefone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function NovoLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    clienteNome: "",
    clienteEmail: "",
    clienteTelefone: "",
    fonte: "",
    tipoObra: "",
    segmentoCliente: "",
  });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!form.clienteNome.trim()) { setErro("Nome do cliente é obrigatório."); return; }
    if (!form.clienteEmail.trim()) { setErro("Email é obrigatório."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clienteEmail)) { setErro("Email inválido."); return; }
    const telefoneDigits = form.clienteTelefone.replace(/\D/g, "");
    if (telefoneDigits.length < 10) { setErro("Telefone inválido (mínimo 10 dígitos)."); return; }
    if (!form.fonte) { setErro("Selecione a fonte do lead."); return; }
    if (!form.tipoObra) { setErro("Selecione o tipo de obra."); return; }
    if (!form.segmentoCliente) { setErro("Selecione o segmento do cliente."); return; }

    setLoading(true);
    try {
      const criado = await comercialApi.criarLead({
        clienteNome: form.clienteNome.trim(),
        clienteEmail: form.clienteEmail.trim(),
        clienteTelefone: telefoneDigits,
        fonte: form.fonte as LeadFonte,
        tipoObra: form.tipoObra as LeadTipoObra,
        segmentoCliente: form.segmentoCliente as LeadSegmentoCliente,
      });
      router.push(`/dashboard/comercial/leads/${criado.leadId}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar lead.");
      setLoading(false);
    }
  }

  const inputCls =
    "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none disabled:opacity-50 text-sm";
  const labelCls = "block text-sm font-semibold text-gray-900 mb-2";
  const selectCls =
    "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none disabled:opacity-50 text-sm bg-white";

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Novo Lead</h1>
        <a
          href="/dashboard/comercial/leads"
          className="text-sm text-gray-500 hover:text-gray-700 font-medium"
        >
          Cancelar
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Dados do Cliente</h2>

          <div>
            <label className={labelCls}>Nome do cliente</label>
            <input
              type="text"
              value={form.clienteNome}
              onChange={(e) => set("clienteNome", e.target.value)}
              disabled={loading}
              placeholder="Ex: João da Silva"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={form.clienteEmail}
                onChange={(e) => set("clienteEmail", e.target.value)}
                disabled={loading}
                placeholder="joao@exemplo.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Telefone</label>
              <input
                type="tel"
                value={form.clienteTelefone}
                onChange={(e) => set("clienteTelefone", formatTelefone(e.target.value))}
                disabled={loading}
                placeholder="(11) 99999-9999"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Classificação</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fonte</label>
              <select
                value={form.fonte}
                onChange={(e) => set("fonte", e.target.value as LeadFonte)}
                disabled={loading}
                className={selectCls}
              >
                <option value="">Selecione a fonte</option>
                {FONTES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Segmento do cliente</label>
              <select
                value={form.segmentoCliente}
                onChange={(e) => set("segmentoCliente", e.target.value as LeadSegmentoCliente)}
                disabled={loading}
                className={selectCls}
              >
                <option value="">Selecione o segmento</option>
                {SEGMENTOS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Tipo de obra</label>
            <select
              value={form.tipoObra}
              onChange={(e) => set("tipoObra", e.target.value as LeadTipoObra)}
              disabled={loading}
              className={selectCls}
            >
              <option value="">Selecione o tipo de obra</option>
              {TIPOS_OBRA.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        )}

        <div className="flex gap-3">
          <a
            href="/dashboard/comercial/leads"
            className="flex-1 text-center border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Cancelar
          </a>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-brand-600 text-white font-semibold py-3 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors text-sm"
          >
            {loading ? "Criando lead..." : "Criar Lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
