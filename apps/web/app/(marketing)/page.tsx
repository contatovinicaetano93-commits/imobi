import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "imbobi — Crédito Inteligente para Construção",
  description:
    "Financiamento ágil para obras residenciais e comerciais. Libere parcelas conforme o avanço real da sua construção.",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-700 to-brand-900 text-white px-6 py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Crédito que acompanha<br />o ritmo da sua obra
        </h1>
        <p className="text-brand-200 text-xl mb-10 max-w-2xl mx-auto">
          Financiamento imobiliário com liberação inteligente por etapas — do
          alicerce à entrega das chaves.
        </p>
        <a
          href="/cadastro"
          className="inline-block bg-white text-brand-800 font-semibold px-8 py-4 rounded-2xl text-lg hover:bg-brand-50 transition-colors"
        >
          Simule seu crédito grátis
        </a>
      </section>

      {/* Como funciona */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-14">
          Como funciona
        </h2>
        <ol className="grid md:grid-cols-4 gap-8">
          {STEPS.map((step, i) => (
            <li key={i} className="text-center">
              <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 font-bold text-xl flex items-center justify-center mx-auto mb-4">
                {i + 1}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA final */}
      <section className="bg-brand-50 py-16 text-center px-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Pronto para começar?
        </h2>
        <a
          href="/cadastro"
          className="inline-block bg-brand-600 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-brand-700 transition-colors"
        >
          Abrir minha conta
        </a>
      </section>
    </main>
  );
}

const STEPS = [
  {
    title: "Simule",
    desc: "Informe o valor e o prazo. Veja parcelas e custo total em segundos.",
  },
  {
    title: "Envie seus dados",
    desc: "KYC 100% digital. Sem papelada, sem burocracia.",
  },
  {
    title: "Acompanhe a obra",
    desc: "Registre cada etapa com fotos geovalidadas pelo app.",
  },
  {
    title: "Receba as parcelas",
    desc: "A cada etapa aprovada, a liberação cai na sua conta.",
  },
];
