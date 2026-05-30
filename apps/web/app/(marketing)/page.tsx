import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IMOBI — Estrutura Financeira para Construção",
  description:
    "Crédito estruturado que acompanha o ritmo real da sua obra. Liberação inteligente por etapas com tecnologia geovalidada.",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-32 md:py-48">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#30D158] rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -left-40 w-80 h-80 bg-[#0052CC] rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
            Estrutura Financeira<br />
            <span className="text-[#30D158]">para Construção Civil</span>
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Crédito estruturado que acompanha o ritmo real da sua obra. Liberação inteligente por etapas com tecnologia geovalidada.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/cadastro"
              className="inline-block bg-[#30D158] text-slate-950 font-bold px-8 py-4 rounded-xl text-lg hover:bg-[#26c443] transition-all transform hover:scale-105"
            >
              Simular Crédito
            </a>
            <a
              href="#como-funciona"
              className="inline-block border-2 border-[#30D158] text-[#30D158] font-bold px-8 py-4 rounded-xl text-lg hover:bg-[#30D158] hover:text-slate-950 transition-all"
            >
              Conhecer Mais
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-20 pt-12 border-t border-gray-700">
            {STATS.map((stat, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-bold text-[#30D158] mb-2">{stat.value}</div>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-24 px-6 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
            A Jornada do Crédito
          </h2>
          <p className="text-center text-gray-400 mb-16 max-w-2xl mx-auto">
            5 camadas de garantias obrigatórias — Alienação fiduciária + Recebiveis + Fundo de reserva 10% + Seguro de crédito + Due diligence rigorosa
          </p>

          <div className="grid md:grid-cols-5 gap-4 mb-12">
            {JOURNEY.map((item, i) => (
              <div key={i} className="relative">
                <div className="bg-gradient-to-b from-[#0052CC] to-slate-800 rounded-xl p-6 border border-[#30D158]/30 hover:border-[#30D158] transition-all">
                  <div className="w-12 h-12 rounded-full bg-[#30D158] text-slate-950 font-bold flex items-center justify-center mb-4 text-lg">
                    {i + 1}
                  </div>
                  <h3 className="font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-300">{item.desc}</p>
                </div>
                {i < JOURNEY.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-0.5 bg-[#30D158]/50"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="py-24 px-6 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
            Por que escolher IMOBI?
          </h2>
          <p className="text-center text-gray-400 mb-16 max-w-2xl mx-auto">
            Tecnologia, segurança e velocidade para financiar sua obra com inteligência
          </p>

          <div className="grid md:grid-cols-4 gap-6">
            {DIFFERENTIALS.map((item, i) => (
              <div key={i} className="bg-slate-800/50 border border-[#30D158]/30 rounded-xl p-8 hover:border-[#30D158] transition-all">
                <div className="text-5xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold text-white mb-3">{item.title}</h3>
                <p className="text-sm text-gray-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Produtos */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
            Produtos Estruturados
          </h2>

          <div className="grid md:grid-cols-4 gap-6">
            {PRODUCTS.map((product, i) => (
              <div
                key={i}
                className={`rounded-xl p-8 border-2 transition-all hover:scale-105 ${
                  product.highlight
                    ? "bg-[#30D158] text-slate-950 border-[#30D158]"
                    : "bg-slate-900 text-white border-gray-700 hover:border-[#30D158]"
                }`}
              >
                <div className={`text-3xl font-bold mb-2 ${product.highlight ? "text-slate-950" : "text-[#30D158]"}`}>
                  {product.name}
                </div>
                <p className="text-sm mb-6 opacity-80">{product.desc}</p>
                <ul className="space-y-2 text-sm">
                  {product.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className={product.highlight ? "text-slate-950" : "text-[#30D158]"}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-24 px-6 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
            Como funciona na prática
          </h2>
          <p className="text-center text-gray-400 mb-16 max-w-2xl mx-auto">
            5 passos simples do pedido ao primeiro desembolso
          </p>

          <div className="grid md:grid-cols-5 gap-4">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} className="relative">
                <div className="bg-gradient-to-b from-[#0052CC]/20 to-slate-800/20 border border-[#30D158]/20 rounded-xl p-6 text-center hover:border-[#30D158] transition-all">
                  <div className="w-12 h-12 rounded-full bg-[#30D158] text-slate-950 font-bold flex items-center justify-center mb-4 text-xl mx-auto">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-300">{item.desc}</p>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-1/4 -right-2 w-4 h-0.5 bg-[#30D158]/30"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Números que Falam */}
      <section className="py-24 px-6 bg-gradient-to-r from-[#0052CC] to-slate-900 border-t border-[#30D158]/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
            Números que Falam
          </h2>

          <div className="grid md:grid-cols-4 gap-6">
            {METRICS.map((metric, i) => (
              <div
                key={i}
                className="bg-white/5 backdrop-blur border border-[#30D158]/30 rounded-xl p-8 text-center hover:border-[#30D158] transition-all"
              >
                <div className="text-4xl font-bold text-[#30D158] mb-2">{metric.value}</div>
                <p className="text-gray-300 text-sm">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Segurança */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
            Suas garantias são nossas prioridades
          </h2>
          <p className="text-center text-gray-400 mb-16 max-w-2xl mx-auto">
            5 camadas de proteção para você e seus investidores dormirem tranquilo
          </p>

          <div className="grid md:grid-cols-5 gap-4">
            {GUARANTEES.map((item) => (
              <div key={item.num} className="bg-slate-900 border border-[#0052CC]/30 rounded-xl p-6 text-center hover:border-[#30D158] transition-all">
                <div className="w-10 h-10 rounded-full bg-[#0052CC] text-white font-bold flex items-center justify-center mb-4 mx-auto text-sm">
                  {item.num}
                </div>
                <h3 className="font-bold text-white mb-2 text-sm">{item.title}</h3>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-24 px-6 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
            Quem confia em IMOBI
          </h2>
          <p className="text-center text-gray-400 mb-16 max-w-2xl mx-auto">
            Histórias reais de construtores e investidores que já cresceram com a gente
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((test, i) => (
              <div key={i} className="bg-slate-800/50 border border-[#30D158]/20 rounded-xl p-8 hover:border-[#30D158] transition-all">
                <p className="text-gray-300 mb-6 italic">"{test.text}"</p>
                <div>
                  <p className="font-bold text-white">{test.name}</p>
                  <p className="text-sm text-[#30D158]">{test.company}</p>
                  <p className="text-xs text-gray-500">{test.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
            Dúvidas frequentes
          </h2>
          <p className="text-center text-gray-400 mb-16">
            Respostas rápidas para suas perguntas
          </p>

          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-[#30D158]/30 rounded-xl overflow-hidden hover:border-[#30D158] transition-all cursor-pointer">
                <summary className="flex justify-between items-center bg-slate-900 p-6 font-bold text-white">
                  {faq.q}
                  <span className="text-[#30D158] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="bg-slate-800/50 p-6 text-gray-300 border-t border-[#30D158]/20">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Para Investidores */}
      <section className="py-24 px-6 bg-gradient-to-r from-[#0052CC]/20 to-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Você é <span className="text-[#30D158]">investidor</span>?
          </h2>
          <p className="text-gray-300 mb-8 text-lg">
            Invista em imóveis e receba retornos de 10% a 14% a.a. com segurança de alienação fiduciária
          </p>
          <a
            href="/investir"
            className="inline-block border-2 border-[#30D158] text-[#30D158] font-bold px-12 py-4 rounded-xl text-lg hover:bg-[#30D158] hover:text-slate-950 transition-all"
          >
            Conheça a IMOBI Invest
          </a>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Pronto para <span className="text-[#30D158]">estruturar</span> seu crédito?
          </h2>
          <p className="text-xl text-gray-300 mb-12">
            Comece a simular seu financiamento em menos de 2 minutos.
          </p>
          <a
            href="/cadastro"
            className="inline-block bg-[#30D158] text-slate-950 font-bold px-12 py-5 rounded-xl text-lg hover:bg-[#26c443] transition-all transform hover:scale-105"
          >
            Abrir Minha Conta
          </a>
        </div>
      </section>
    </main>
  );
}

const STATS = [
  { value: "R$517M", label: "Volume Captado" },
  { value: "150k+", label: "Investidores" },
  { value: "83%", label: "LTV Máximo" },
];

const JOURNEY = [
  { title: "Simule", desc: "Veja parcelas, prazos e custo total em segundos." },
  { title: "Envie dados", desc: "KYC 100% digital, sem papelada." },
  { title: "Acompanhe", desc: "Fotos geovalidadas de cada etapa." },
  { title: "Libere parcelas", desc: "Automático conforme aprovação." },
  { title: "Repasse", desc: "Distribuição a investidores." },
];

const PRODUCTS = [
  {
    name: "Terreno",
    desc: "Aquisição do lote",
    highlight: false,
    features: [
      "Até 70% do VGV",
      "Até R$40M",
      "Prazo: 90–120 dias",
    ],
  },
  {
    name: "Construção",
    desc: "Execução da obra",
    highlight: true,
    features: [
      "Até 80% do VGV",
      "Maior volume",
      "12–36 meses",
    ],
  },
  {
    name: "Acabamento",
    desc: "Finalização",
    highlight: false,
    features: [
      "Até 85% do VGV",
      "Última etapa",
      "6–18 meses",
    ],
  },
  {
    name: "Comprador",
    desc: "Financiamento ao comprador",
    highlight: false,
    features: [
      "Até 80% do VGV",
      "Pessoa física",
      "Refinanciamento",
    ],
  },
];

const METRICS = [
  { value: "R$517M", label: "Volume total captado" },
  { value: "150k+", label: "Investidores cadastrados" },
  { value: "8 estados", label: "Presença nacional" },
  { value: "2.800+", label: "Moradias viabilizadas" },
];

const DIFFERENTIALS = [
  {
    title: "Geovalidação Inteligente",
    desc: "Fotos verificadas por GPS de cada etapa da obra para garantir segurança total",
    icon: "📍"
  },
  {
    title: "Liberação por Etapas",
    desc: "Não é um saque único. Parcelas liberadas conforme progresso real da obra",
    icon: "📊"
  },
  {
    title: "Aprovação em 48h",
    desc: "KYC 100% digital. Nenhuma papelada. Análise rápida e eficiente",
    icon: "⚡"
  },
  {
    title: "Taxa Competitiva",
    desc: "Juros reduzidos porque temos 5 camadas de garantia obrigatória",
    icon: "💰"
  }
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Pré-aprovação",
    desc: "Simule em 2 minutos e veja se está apto"
  },
  {
    step: "2",
    title: "Análise de Crédito",
    desc: "KYC digital e análise do projeto em até 48h"
  },
  {
    step: "3",
    title: "Contrato Digital",
    desc: "Assine online com alienação fiduciária automática"
  },
  {
    step: "4",
    title: "Primeira Parcela",
    desc: "Receba o crédito em sua conta bancária"
  },
  {
    step: "5",
    title: "Acompanhamento",
    desc: "Fotos geovalidadas liberando parcelas automaticamente"
  }
];

const TESTIMONIALS = [
  {
    name: "João Silva",
    company: "Silva Construções",
    text: "Conseguimos R$5M em 10 dias. Sem IMOBI não tínhamos feito essa obra.",
    location: "São Paulo, SP"
  },
  {
    name: "Maria Santos",
    company: "Investidora de Impacto",
    text: "Melhor rentabilidade do mercado com segurança de alienação fiduciária.",
    location: "Rio de Janeiro, RJ"
  },
  {
    name: "Pedro Costa",
    company: "Costa Incorporadora",
    text: "Processo transparente e rápido. Excelente suporte técnico.",
    location: "Belo Horizonte, MG"
  }
];

const FAQS = [
  {
    q: "Quem pode contratar?",
    a: "Qualquer pessoa jurídica (PJ) com registro em órgão responsável e projeto de construção legítimo. Pode ser terreno, reforma ou novo empreendimento."
  },
  {
    q: "Quanto tempo leva para aprovar?",
    a: "A pré-aprovação é imediata. A aprovação final leva até 48h após envio de documentação. O crédito é liberado em até 5 dias úteis."
  },
  {
    q: "Qual a taxa de juros?",
    a: "A taxa varia de 8% a 14% a.a. dependendo do perfil, garantias e volume. Solicite uma simulação personalizada."
  },
  {
    q: "Como funciona a segurança?",
    a: "Temos 5 camadas: alienação fiduciária, recebiveis da obra, fundo de reserva 10%, seguro de crédito e due diligence rigorosa."
  },
  {
    q: "Posso sacar todo o valor de uma vez?",
    a: "Não. As parcelas são liberadas conforme aprovação de etapas via fotos geovalidadas. Isso protege você e os investidores."
  },
  {
    q: "E se minha obra atrasar?",
    a: "Você tem até 30 dias de flexibilidade. Após isso, ajustamos o cronograma. Paralisações precisam ser comunicadas formalmente."
  }
];

const GUARANTEES = [
  {
    num: "1",
    title: "Alienação Fiduciária",
    desc: "IMOBI tem direito de venda do imóvel em caso de inadimplência"
  },
  {
    num: "2",
    title: "Recebiveis da Obra",
    desc: "Crédito sobre vendas e recebimentos do empreendimento"
  },
  {
    num: "3",
    title: "Fundo de Reserva 10%",
    desc: "Você deposita 10% que fica em custódia para cobrir riscos"
  },
  {
    num: "4",
    title: "Seguro de Crédito",
    desc: "Seguradora 100% solidária em caso de perdas"
  },
  {
    num: "5",
    title: "Due Diligence Rigorosa",
    desc: "Análise jurídica completa do projeto e documentação"
  }
];
