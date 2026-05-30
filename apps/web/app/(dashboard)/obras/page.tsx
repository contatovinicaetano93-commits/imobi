export default function ObrasPage() {
  const obras = [
    {
      nome: "Residencial Park Avenue",
      local: "São Paulo, SP",
      progresso: 65,
      etapa: "Estrutura",
      status: "Em acompanhamento",
    },
    {
      nome: "Centro Comercial West",
      local: "Belo Horizonte, MG",
      progresso: 40,
      etapa: "Fundação",
      status: "Em acompanhamento",
    },
    {
      nome: "Condomínio Flex Living",
      local: "Curitiba, PR",
      progresso: 85,
      etapa: "Acabamento",
      status: "Última etapa",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Minhas Obras</h1>

      <div className="space-y-4">
        {obras.map((obra) => (
          <div
            key={obra.nome}
            className="bg-slate-900 rounded-lg border border-slate-800 p-6 hover:border-green-400 transition cursor-pointer"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{obra.nome}</h3>
                <p className="text-slate-400 text-sm">{obra.local}</p>
              </div>
              <span className="px-3 py-1 bg-green-400/20 text-green-400 rounded-full text-sm font-bold">
                {obra.status}
              </span>
            </div>

            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <p className="text-slate-400 text-sm">Etapa: {obra.etapa}</p>
                <p className="text-green-400 font-bold">{obra.progresso}%</p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-green-400 h-2 rounded-full transition-all"
                  style={{ width: `${obra.progresso}%` }}
                ></div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="text-green-400 hover:text-green-300 text-sm font-bold">
                Ver Detalhes
              </button>
              <button className="text-blue-400 hover:text-blue-300 text-sm font-bold">
                Enviar Fotos
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
