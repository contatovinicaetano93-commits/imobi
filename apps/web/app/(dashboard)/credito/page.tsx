export default function CreditoDashboard() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Meu Crédito</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Limite Disponível</p>
          <p className="text-3xl font-bold text-green-400">R$ 5.2M</p>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Utilizado</p>
          <p className="text-3xl font-bold text-orange-400">R$ 2.8M</p>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-2">Disponível</p>
          <p className="text-3xl font-bold text-slate-300">R$ 2.4M</p>
        </div>
      </div>

      <section className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Histórico de Parcelas</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex justify-between items-center p-4 bg-slate-800 rounded-lg"
            >
              <div>
                <p className="text-white font-bold">Parcela {i}</p>
                <p className="text-slate-400 text-sm">Etapa de fundação</p>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-bold">R$ 350.000</p>
                <p className="text-slate-400 text-sm">Liberada</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
