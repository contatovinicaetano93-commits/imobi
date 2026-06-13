import type { Metadata } from "next";
import { FileText, Download, ExternalLink, Package, BookOpen, PieChart, Presentation } from "lucide-react";

export const metadata: Metadata = { title: "Materiais Comerciais — IMOBI" };

const MATERIAIS = [
  {
    categoria: "Apresentações",
    icon: Presentation,
    cor: "#1d4ed8",
    items: [
      { nome: "Apresentação Institucional IMOBI",        desc: "Visão geral da empresa, diferenciais e cases",   formato: "PDF" },
      { nome: "Pitch Deck — Produto de Crédito",          desc: "Produto, taxas, prazos e processo de aprovação", formato: "PDF" },
      { nome: "Proposta Comercial (template editável)",   desc: "Template para personalizar e enviar ao cliente", formato: "PPTX" },
    ],
  },
  {
    categoria: "Produto e Tabelas",
    icon: PieChart,
    cor: "#d97706",
    items: [
      { nome: "Tabela de Taxas e Condições",              desc: "Taxas vigentes, LTV máximo, prazos e limites",   formato: "PDF" },
      { nome: "Guia de Elegibilidade do Tomador",         desc: "Critérios de aprovação, documentação necessária",formato: "PDF" },
      { nome: "FAQ — Perguntas frequentes dos clientes",  desc: "Respostas prontas para dúvidas comuns",          formato: "PDF" },
    ],
  },
  {
    categoria: "Treinamento",
    icon: BookOpen,
    cor: "#16a34a",
    items: [
      { nome: "Manual do Parceiro IMOBI",                 desc: "Guia completo de processos, comissões e suporte",formato: "PDF" },
      { nome: "Processo de Indicação — Passo a Passo",    desc: "Como indicar, acompanhar e receber comissão",    formato: "PDF" },
    ],
  },
  {
    categoria: "Materiais de Marketing",
    icon: Package,
    cor: "#7c3aed",
    items: [
      { nome: "Kit de Posts para Redes Sociais",          desc: "Imagens e textos prontos para WhatsApp e Insta", formato: "ZIP" },
      { nome: "Logo e Identidade Visual IMOBI",           desc: "Arquivos de identidade para uso autorizado",     formato: "ZIP" },
    ],
  },
];

export default function MateriaisPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div style={{ background: "linear-gradient(135deg, #78350f 0%, #92400e 100%)", borderRadius: 16, padding: "1.5rem", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ background: "#d9770622", border: "1px solid #d9770644", borderRadius: 8, padding: "0.4rem" }}>
            <FileText size={18} color="#d97706" />
          </div>
          <div>
            <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Parceiro Comercial</p>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Materiais Comerciais</h1>
          </div>
        </div>
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", margin: 0 }}>
          Apresentações, tabelas, treinamentos e materiais de apoio à venda
        </p>
      </div>

      {MATERIAIS.map(({ categoria, icon: Icon, cor, items }) => (
        <section key={categoria}>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Icon size={14} style={{ color: cor }} />
            {categoria}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(({ nome, desc, formato }) => (
              <div key={nome} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{nome}</p>
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cor + "18", color: cor }}>
                      {formato}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
                <button
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold w-full py-2 rounded-xl border transition hover:opacity-80"
                  style={{ borderColor: cor + "40", color: cor, background: cor + "08" }}
                  onClick={() => alert("Material disponível em breve. Entre em contato com o suporte para acesso antecipado.")}
                >
                  <Download size={12} />
                  Baixar
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="bg-[#1d4ed8] rounded-2xl p-5 text-white flex items-start gap-3">
        <ExternalLink size={18} className="shrink-0 mt-0.5 text-blue-300" />
        <div>
          <p className="text-sm font-semibold">Precisa de material personalizado?</p>
          <p className="text-xs text-blue-200 mt-1 leading-relaxed">
            Entre em contato com nossa equipe de marketing pelo WhatsApp ou e-mail para solicitar materiais específicos para o seu perfil de clientes.
          </p>
          <a
            href="https://wa.me/5511993455589?text=Olá! Sou parceiro IMOBI e preciso de materiais personalizados."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 transition px-3 py-1.5 rounded-xl"
          >
            Falar com marketing <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}
