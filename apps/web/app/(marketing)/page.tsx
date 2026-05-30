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
