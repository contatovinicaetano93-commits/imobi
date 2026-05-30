export default function EngenheiroDashboard() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Painel do Engenheiro</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Obras em Acompanhamento</p>
          <p className="text-3xl font-bold text-green-400">24</p>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Fotos Pendentes</p>
          <p className="text-3xl font-bold text-orange-400">12</p>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Etapas Aprovadas</p>
          <p className="text-3xl font-bold text-green-400">156</p>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Volume Geovalidado</p>
          <p className="text-3xl font-bold text-blue-400">R$ 87M</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Obras Críticas</h2>
          <div className="space-y-3">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-white font-bold">Residencial Park Avenue</p>
              <p className="text-red-400 text-sm">Etapa 3 sem geovalidação há 5 dias</p>
            </div>
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-white font-bold">Centro Comercial West</p>
              <p className="text-yellow-400 text-sm">Aguardando fotos da etapa 2</p>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Ações Rápidas</h2>
          <div className="space-y-3">
            <button className="w-full bg-green-400 text-slate-950 font-bold py-2 rounded-lg hover:bg-green-500 transition">
              Revisar Fotos Pendentes
            </button>
            <button className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">
              Gerar Relatório de Etapas
            </button>
            <button className="w-full bg-slate-800 text-slate-300 font-bold py-2 rounded-lg hover:bg-slate-700 transition">
              Exportar Dados
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
