export default function ComoFuncionaPage() {
  const steps = [
    {
      numero: 1,
      titulo: "Simule",
      descricao: "Veja parcelas, prazos e custo total em segundos.",
    },
    {
      numero: 2,
      titulo: "Envie Dados",
      descricao: "KYC 100% digital, sem papelada.",
    },
    {
      numero: 3,
      titulo: "Acompanhe",
      descricao: "Fotos geovalidadas de cada etapa.",
    },
    {
      numero: 4,
      titulo: "Libere Parcelas",
      descricao: "Automático conforme aprovação.",
    },
    {
      numero: 5,
      titulo: "Receba Repasse",
      descricao: "Distribuição automática a investidores.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">Como Funciona</h1>
        <p className="text-slate-400 mb-12 text-lg">
          5 passos simples do pré-aprovação ao repasse
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {steps.map((step) => (
            <div
              key={step.numero}
              className="bg-gradient-to-br from-blue-600 to-slate-800 rounded-lg border border-green-400/30 p-6 hover:border-green-400 transition"
            >
              <div className="w-12 h-12 bg-green-400 text-slate-950 font-bold rounded-full flex items-center justify-center mb-4 text-lg">
                {step.numero}
              </div>
              <h3 className="text-white font-bold mb-2">{step.titulo}</h3>
              <p className="text-slate-300 text-sm">{step.descricao}</p>
            </div>
          ))}
        </div>

        <section className="mt-16 bg-slate-900 rounded-lg border border-slate-800 p-8">
          <h2 className="text-2xl font-bold text-green-400 mb-4">
            Segurança em 5 Camadas
          </h2>
          <ul className="text-slate-300 space-y-3">
            <li>✓ <strong>Alienação Fiduciária</strong> — Garantia sobre o imóvel</li>
            <li>✓ <strong>Recebiveis</strong> — Fluxo de caixa da obra</li>
            <li>✓ <strong>Fundo de Reserva 10%</strong> — Proteção extra</li>
            <li>✓ <strong>Seguro de Crédito</strong> — Cobertura para defaults</li>
            <li>✓ <strong>Due Diligence Rigorosa</strong> — Análise de risco</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
