export default function DashboardHomepage() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo!</h1>
      <p className="text-slate-400 mb-8">Aqui você gerencia todo seu crédito e suas obras</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-500/20 to-slate-900 rounded-lg border border-green-400/30 p-6">
          <p className="text-slate-400 text-sm mb-2">Crédito Total Disponível</p>
          <p className="text-4xl font-bold text-green-400">R$ 5.2M</p>
          <button className="mt-4 text-green-400 hover:text-green-300 font-bold text-sm">
            Ver Detalhes →
          </button>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-slate-900 rounded-lg border border-blue-400/30 p-6">
          <p className="text-slate-400 text-sm mb-2">Obras em Acompanhamento</p>
          <p className="text-4xl font-bold text-blue-400">3</p>
          <button className="mt-4 text-blue-400 hover:text-blue-300 font-bold text-sm">
            Gerenciar Obras →
          </button>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-slate-900 rounded-lg border border-orange-400/30 p-6">
          <p className="text-slate-400 text-sm mb-2">Parcelas Pendentes</p>
          <p className="text-4xl font-bold text-orange-400">2</p>
          <button className="mt-4 text-orange-400 hover:text-orange-300 font-bold text-sm">
            Enviar Fotos →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Próximos Passos</h2>
          <ol className="space-y-3 text-slate-300">
            <li className="flex gap-3">
              <span className="text-green-400 font-bold">1.</span>
              <span>Enviar fotos geovalidadas da etapa de fundação</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-400 font-bold">2.</span>
              <span>Revisar e assinar contrato da Etapa 2</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-400 font-bold">3.</span>
              <span>Atualizar documentação da obra — Validade 30/06/2024</span>
            </li>
          </ol>
        </section>

        <section className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Alertas</h2>
          <div className="space-y-3">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 font-bold text-sm">⚠ Atenção</p>
              <p className="text-slate-300 text-sm">Documentação vence em 15 dias</p>
            </div>
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 font-bold text-sm">✓ Sucesso</p>
              <p className="text-slate-300 text-sm">Etapa 1 foi aprovada e liberada</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
