export default function AdminDashboard() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Painel Administrativo</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Usuários Ativos</p>
          <p className="text-3xl font-bold text-green-400">1.240</p>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Operações Hoje</p>
          <p className="text-3xl font-bold text-blue-400">342</p>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Volume Processado</p>
          <p className="text-3xl font-bold text-green-400">R$ 24.5M</p>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Taxa de Erro</p>
          <p className="text-3xl font-bold text-green-400">0.02%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <section className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Atividades Recentes</h2>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-slate-800 rounded-lg">
              <p className="text-slate-300"><span className="text-green-400">✓</span> Obra geovalidada — Residencial Park Avenue</p>
              <p className="text-slate-500 text-xs">5 minutos atrás</p>
            </div>
            <div className="p-3 bg-slate-800 rounded-lg">
              <p className="text-slate-300"><span className="text-green-400">✓</span> Parcela liberada — R$ 890.000</p>
              <p className="text-slate-500 text-xs">12 minutos atrás</p>
            </div>
            <div className="p-3 bg-slate-800 rounded-lg">
              <p className="text-slate-300"><span className="text-orange-400">⚠</span> Erro no envio KYC — João Silva</p>
              <p className="text-slate-500 text-xs">28 minutos atrás</p>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Gestão Rápida</h2>
          <div className="space-y-2">
            <button className="w-full bg-green-400 text-slate-950 font-bold py-2 rounded-lg hover:bg-green-500 transition">
              Gerenciar Usuários
            </button>
            <button className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition">
              Relatórios & Analytics
            </button>
            <button className="w-full bg-slate-800 text-slate-300 font-bold py-2 rounded-lg hover:bg-slate-700 transition">
              Configurações do Sistema
            </button>
            <button className="w-full bg-slate-800 text-slate-300 font-bold py-2 rounded-lg hover:bg-slate-700 transition">
              Logs & Auditoria
            </button>
          </div>
        </section>
      </div>

      <section className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Status dos Serviços</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "API NestJS", status: "online" },
            { name: "PostgreSQL", status: "online" },
            { name: "Redis", status: "online" },
          ].map((service) => (
            <div key={service.name} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
              <span className="text-slate-300">{service.name}</span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 text-sm">{service.status}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
