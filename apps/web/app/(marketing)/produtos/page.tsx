export default function ProdutosPage() {
  const produtos = [
    {
      nome: "Terreno",
      descricao: "Aquisição do lote",
      ltv: "70%",
      volume: "Até R$40M",
      prazo: "90–120 dias",
    },
    {
      nome: "Construção",
      descricao: "Execução da obra",
      ltv: "80%",
      volume: "Maior volume",
      prazo: "12–36 meses",
      destaque: true,
    },
    {
      nome: "Acabamento",
      descricao: "Finalização da obra",
      ltv: "85%",
      volume: "Maior aprovação",
      prazo: "6–18 meses",
    },
    {
      nome: "Comprador",
      descricao: "Financiamento ao comprador",
      ltv: "80%",
      volume: "Pessoa física",
      prazo: "Longo prazo",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">Nossos Produtos</h1>
        <p className="text-slate-400 mb-12 text-lg">
          4 linhas de crédito estruturadas para cada fase da construção
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {produtos.map((produto) => (
            <div
              key={produto.nome}
              className={`rounded-lg border p-6 transition ${
                produto.destaque
                  ? "bg-green-400 text-slate-950 border-green-400"
                  : "bg-slate-900 border-slate-800 text-white"
              }`}
            >
              <h3 className={`text-xl font-bold mb-2 ${produto.destaque ? "" : "text-green-400"}`}>
                {produto.nome}
              </h3>
              <p className={`text-sm mb-4 ${produto.destaque ? "text-slate-900" : "text-slate-400"}`}>
                {produto.descricao}
              </p>

              <div className="space-y-2 text-sm">
                <div>LTV: {produto.ltv}</div>
                <div>Volume: {produto.volume}</div>
                <div>Prazo: {produto.prazo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
