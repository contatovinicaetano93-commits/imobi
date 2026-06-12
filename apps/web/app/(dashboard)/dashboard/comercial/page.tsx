"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Copy,
  Handshake,
  Link2,
  Mail,
  Plus,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Users,
  Download,
  Star,
} from "lucide-react";
import { formatarBRL } from "@imbobi/core";
import type { ParceiroResumo, OperacaoIndicada, ContatoMailing } from "@/lib/api";

const DEMO_RESUMO: ParceiroResumo = {
  comissoesAReceber: 14_800,
  comissoesPagasMes: 6_200,
  comissoesPagasTotal: 38_450,
  operacoesAtivas: 5,
  taxaAprovacao: 72,
  codigoIndicacao: "PARC-7K2M",
};

const DEMO_OPERACOES: OperacaoIndicada[] = [
  { id: "o1", codigo: "OP-2026-0341", clienteRef: "Carlos M.",   status: "EM_OBRA",    valorBase: 480_000, percentualComissao: 1.5, valorComissao: 7_200, comissaoStatus: "LIBERADA", validadeIndicacao: "2026-12-10", criadoEm: "2026-02-14" },
  { id: "o2", codigo: "OP-2026-0387", clienteRef: "Fernanda S.", status: "APROVADA",   valorBase: 320_000, percentualComissao: 1.5, valorComissao: 4_800, comissaoStatus: "PENDENTE", validadeIndicacao: "2026-11-02", criadoEm: "2026-03-08" },
  { id: "o3", codigo: "OP-2026-0402", clienteRef: "Roberto A.",  status: "EM_ANALISE", valorBase: 190_000, percentualComissao: 1.5, valorComissao: 2_850, comissaoStatus: "PENDENTE", validadeIndicacao: "2026-10-20", criadoEm: "2026-04-19" },
  { id: "o4", codigo: "OP-2026-0298", clienteRef: "Juliana P.",  status: "CONCLUIDA",  valorBase: 410_000, percentualComissao: 1.5, valorComissao: 6_150, comissaoStatus: "PAGA",     validadeIndicacao: "2026-08-15", criadoEm: "2026-01-22" },
  { id: "o5", codigo: "OP-2026-0415", clienteRef: "Marcos T.",   status: "INDICADA",   valorBase: 0,       percentualComissao: 1.5, valorComissao: 0,     comissaoStatus: "PENDENTE", validadeIndicacao: "2026-09-30", criadoEm: "2026-05-28" },
];

const DEMO_MAILING: ContatoMailing[] = [
  { id: "m1", nome: "Carlos Mendes",    email: "c.mendes@exemplo.com",   telefone: "(11) 98888-0001", status: "CONVERTIDO", criadoEm: "2026-01-10" },
  { id: "m2", nome: "Fernanda Souza",   email: "f.souza@exemplo.com",    telefone: "(11) 98888-0002", status: "CONVERTIDO", criadoEm: "2026-02-20" },
  { id: "m3", nome: "Roberto Andrade",  email: "r.andrade@exemplo.com",  telefone: "(11) 98888-0003", status: "CONTATADO",  criadoEm: "2026-04-02" },
  { id: "m4", nome: "Patrícia Lima",    email: "p.lima@exemplo.com",     telefone: "(11) 98888-0004", status: "NOVO",       criadoEm: "2026-05-30" },
];

const OPERACAO_STATUS: Record<OperacaoIndicada["status"], { label: string; cls: string }> = {
  INDICADA:   { label: "Indicada",    cls: "bg-gray-100 text-gray-600" },
  EM_ANALISE: { label: "Em análise",  cls: "bg-blue-100 text-blue-700" },
  APROVADA:   { label: "Aprovada",    cls: "bg-green-100 text-green-700" },
  EM_OBRA:    { label: "Em obra",     cls: "bg-blue-100 text-[#1B4FD8]" },
  CONCLUIDA:  { label: "Concluída",   cls: "bg-green-100 text-[#16a34a]" },
  RECUSADA:   { label: "Recusada",    cls: "bg-red-100 text-red-700" },
};

const COMISSAO_STATUS: Record<OperacaoIndicada["comissaoStatus"], { label: string; cls: string }> = {
  PENDENTE: { label: "Pendente", cls: "bg-gray-100 text-gray-600" },
  LIBERADA: { label: "Liberada", cls: "bg-amber-100 text-amber-700" },
  PAGA:     { label: "Paga",     cls: "bg-green-100 text-green-700" },
};

const MAILING_STATUS: Record<ContatoMailing["status"], { label: string; cls: string }> = {
  NOVO:       { label: "Novo",       cls: "bg-blue-100 text-blue-700" },
  CONTATADO:  { label: "Contatado",  cls: "bg-amber-100 text-amber-700" },
  CONVERTIDO: { label: "Convertido", cls: "bg-green-100 text-green-700" },
};

export default function ParceiroComercialPage() {
  const [resumo, setResumo] = useState<ParceiroResumo | null>(null);
  const [operacoes, setOperacoes] = useState<OperacaoIndicada[] | null>(null);
  const [mailing, setMailing] = useState<ContatoMailing[] | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [novoContato, setNovoContato] = useState({ nome: "", email: "", telefone: "" });
  const [adicionando, setAdicionando] = useState(false);

  useEffect(() => {
    // Try primary endpoint; if it fails, fall back to comercial/dashboard/stats
    fetch("/api/proxy/parceiros/resumo")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .catch(() =>
        fetch("/api/proxy/comercial/dashboard/stats")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
      .then((d: ParceiroResumo | null) => {
        if (d) { setResumo(d); } else { setResumo(DEMO_RESUMO); setIsDemo(true); }
      });
    fetch("/api/proxy/parceiros/operacoes")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d: OperacaoIndicada[] | null) => setOperacoes(d && d.length > 0 ? d : DEMO_OPERACOES));
    fetch("/api/proxy/parceiros/mailing")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d: ContatoMailing[] | null) => setMailing(d && d.length > 0 ? d : DEMO_MAILING));
  }, []);

  const rs = resumo ?? DEMO_RESUMO;
  const linkIndicacao = typeof window !== "undefined"
    ? `${window.location.origin}/cadastro?ref=${rs.codigoIndicacao}`
    : `/cadastro?ref=${rs.codigoIndicacao}`;

  function copiarLink() {
    navigator.clipboard.writeText(linkIndicacao).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function exportarMailingCsv() {
    if (!mailing) return;
    const header = "nome,email,telefone,status,criado_em";
    const rows = mailing.map((c) =>
      [c.nome, c.email, c.telefone ?? "", c.status, c.criadoEm].map((v) => `"${v}"`).join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mailing-imobi.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function adicionarContato(e: React.FormEvent) {
    e.preventDefault();
    if (!novoContato.nome || !novoContato.email) return;
    setAdicionando(true);
    const contato: ContatoMailing = {
      id: `local-${Date.now()}`,
      nome: novoContato.nome,
      email: novoContato.email,
      telefone: novoContato.telefone || undefined,
      status: "NOVO",
      criadoEm: new Date().toISOString(),
    };
    try {
      const res = await fetch("/api/proxy/parceiros/mailing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: contato.nome, email: contato.email, telefone: contato.telefone }),
      });
      if (res.ok) {
        const saved = (await res.json()) as ContatoMailing;
        setMailing((p) => [saved, ...(p ?? [])]);
      } else {
        setMailing((p) => [contato, ...(p ?? [])]);
      }
    } catch {
      setMailing((p) => [contato, ...(p ?? [])]);
    }
    setNovoContato({ nome: "", email: "", telefone: "" });
    setAdicionando(false);
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Hero comercial - âmbar/dourado */}
      <div style={{ background: "linear-gradient(135deg, #78350f 0%, #92400e 100%)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.5rem", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ background: "#d9770622", border: "1px solid #d9770644", borderRadius: 8, padding: "0.4rem" }}>
            <Star size={18} color="#d97706" />
          </div>
          <div>
            <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Portal Comercial</p>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Indicações &amp; Comissões</h1>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", margin: 0 }}>
            Acompanhe suas indicações, comissões e pipeline de leads em tempo real.
          </p>
          {isDemo && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.7rem", fontWeight: 600, color: "#fde68a", background: "rgba(253,230,138,0.12)", border: "1px solid rgba(253,230,138,0.25)", borderRadius: 999, padding: "0.25rem 0.75rem" }}>
              <AlertTriangle size={12} />
              Dados de demonstração
            </span>
          )}
        </div>
      </div>

      {/* Pipeline de leads */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-2">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#d97706]" />
          Pipeline de leads
        </h2>
        <div className="flex items-center gap-0 overflow-x-auto">
          {[
            { label: "Novo",        count: 1, color: "#6b7280", bg: "#f3f4f6" },
            { label: "Contatado",   count: 1, color: "#0369a1", bg: "#e0f2fe" },
            { label: "Qualificado", count: 2, color: "#7c3aed", bg: "#ede9fe" },
            { label: "Proposta",    count: 1, color: "#d97706", bg: "#fef3c7" },
            { label: "Convertido",  count: 2, color: "#16a34a", bg: "#dcfce7" },
          ].map((stage, i, arr) => (
            <div key={stage.label} className="flex items-center min-w-0 shrink-0">
              <div className="flex flex-col items-center px-3 py-2 rounded-xl text-center" style={{ background: stage.bg, minWidth: 90 }}>
                <span className="text-lg font-bold tabular-nums" style={{ color: stage.color }}>{stage.count}</span>
                <span className="text-xs font-medium" style={{ color: stage.color }}>{stage.label}</span>
              </div>
              {i < arr.length - 1 && (
                <span className="text-gray-300 mx-1 text-lg font-light select-none">›</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Link de indicação */}
      <div className="bg-[#1B4FD8] rounded-2xl p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-200 mb-1 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" /> Seu link de indicação
          </p>
          <p className="font-mono text-sm sm:text-base truncate opacity-95">{linkIndicacao}</p>
          <p className="text-xs text-blue-200 mt-1.5">
            Código <span className="font-bold text-white">{rs.codigoIndicacao}</span> — toda operação originada por este link é vinculada automaticamente à sua comissão.
          </p>
        </div>
        <button
          onClick={copiarLink}
          className="shrink-0 flex items-center gap-2 bg-white text-[#1B4FD8] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-[#16a34a]" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copiado!" : "Copiar link"}
        </button>
      </div>

      {/* KPIs de comissão */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {resumo === null
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse shrink-0" />
                  <div className="h-3 w-20 bg-gray-100 rounded-lg animate-pulse" />
                </div>
                <div className="h-6 w-24 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-3 w-16 bg-gray-100 rounded-lg animate-pulse mt-1" />
              </div>
            ))
          : [
              { icon: Banknote,    label: "A receber",        val: formatarBRL(rs.comissoesAReceber),  color: "#1B4FD8", sub: "comissões liberadas + pendentes" },
              { icon: CheckCircle2,label: "Pagas no mês",     val: formatarBRL(rs.comissoesPagasMes),  color: "#16a34a", sub: "recebidas neste mês" },
              { icon: TrendingUp,  label: "Total recebido",   val: formatarBRL(rs.comissoesPagasTotal),color: "#16a34a", sub: "desde o início da parceria" },
              { icon: Users,       label: "Operações ativas", val: String(rs.operacoesAtivas),         color: "#0369a1", sub: `${rs.taxaAprovacao}% de aprovação` },
            ].map(({ icon: Icon, label, val, color, sub }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "14" }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <span className="text-xs text-gray-500 font-medium leading-tight">{label}</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-gray-900 tabular-nums">{val}</p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
            ))
        }
      </div>

      {/* Operações indicadas */}
      <section aria-labelledby="operacoes-title">
        <h2 id="operacoes-title" className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#1B4FD8]" />
          Operações indicadas
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Operação</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Comissão</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Situação</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Validade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(operacoes ?? []).map((op) => {
                  const st = OPERACAO_STATUS[op.status];
                  const cs = COMISSAO_STATUS[op.comissaoStatus];
                  return (
                    <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-900 font-mono text-xs">{op.codigo}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{op.clienteRef} · indicada em {new Date(op.criadoEm).toLocaleDateString("pt-BR")}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className="font-bold text-gray-900 tabular-nums">{op.valorComissao > 0 ? formatarBRL(op.valorComissao) : "—"}</p>
                        <p className="text-xs text-gray-400">{op.percentualComissao}% da operação</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${cs.cls}`}>{cs.label}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-gray-500 tabular-nums whitespace-nowrap">
                        {new Date(op.validadeIndicacao).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Mailing */}
      <section aria-labelledby="mailing-title">
        <div className="flex items-center justify-between mb-4">
          <h2 id="mailing-title" className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#1B4FD8]" />
            Mailing de contatos
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={exportarMailingCsv}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#1B4FD8] hover:text-[#1B4FD8] transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
            <a
              href="/dashboard/comercial/leads"
              className="text-xs font-semibold text-[#1B4FD8] hover:underline"
            >
              Gestão completa de leads
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Lista */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {(mailing ?? []).map((c) => {
                const st = MAILING_STATUS[c.status];
                return (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1B4FD8] flex items-center justify-center text-xs font-bold shrink-0">
                      {c.nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.nome}</p>
                      <p className="text-xs text-gray-400 truncate">{c.email}{c.telefone ? ` · ${c.telefone}` : ""}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${st.cls}`}>{st.label}</span>
                  </div>
                );
              })}
              {mailing && mailing.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-gray-400">Nenhum contato no mailing ainda.</p>
              )}
            </div>
          </div>

          {/* Novo contato */}
          <form onSubmit={adicionarContato} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 self-start">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#16a34a]" /> Adicionar contato
            </h3>
            <input
              type="text"
              placeholder="Nome completo"
              value={novoContato.nome}
              onChange={(e) => setNovoContato((p) => ({ ...p, nome: e.target.value }))}
              required
              className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8] focus:border-transparent"
            />
            <input
              type="email"
              placeholder="E-mail"
              value={novoContato.email}
              onChange={(e) => setNovoContato((p) => ({ ...p, email: e.target.value }))}
              required
              className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8] focus:border-transparent"
            />
            <input
              type="tel"
              placeholder="Telefone (opcional)"
              value={novoContato.telefone}
              onChange={(e) => setNovoContato((p) => ({ ...p, telefone: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8] focus:border-transparent"
            />
            <button
              type="submit"
              disabled={adicionando}
              className="w-full text-sm font-semibold text-white rounded-xl py-2.5 transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "#16a34a" }}
            >
              {adicionando ? "Salvando…" : "Salvar contato"}
            </button>
          </form>
        </div>
      </section>

      {/* Nota de privacidade */}
      <div className="flex items-start gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <ShieldCheck className="w-5 h-5 text-[#16a34a] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Transparência e privacidade</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Você visualiza apenas o essencial das operações que indicou: código, status, validade da indicação e a sua comissão.
            Dados pessoais, financeiros e documentos dos clientes não são exibidos neste portal, em conformidade com a LGPD.
          </p>
        </div>
      </div>
    </div>
  );
}
