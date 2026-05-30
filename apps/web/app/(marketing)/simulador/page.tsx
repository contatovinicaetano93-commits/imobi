export default function SimuladorPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Simule Seu Crédito</h1>
        <p className="text-slate-400 mb-12">
          Veja quanto você pode financiar e em quanto tempo
        </p>

        <div className="bg-slate-900 rounded-lg border border-slate-800 p-8 space-y-6">
          <div>
            <label className="block text-slate-300 mb-2">Valor do Empreendimento</label>
            <input
              type="number"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500"
              placeholder="R$ 1.000.000"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-2">Localização</label>
            <input
              type="text"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500"
              placeholder="Estado/Cidade"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-2">Tipo de Obra</label>
            <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white">
              <option>Terreno</option>
              <option>Construção</option>
              <option>Acabamento</option>
              <option>Financiamento Comprador</option>
            </select>
          </div>

          <button className="w-full bg-green-400 text-slate-950 font-bold py-3 rounded-lg hover:bg-green-500 transition">
            Simular Crédito
          </button>
        </div>
      </div>
    </div>
  );
}
