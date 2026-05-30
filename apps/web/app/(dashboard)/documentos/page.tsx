export default function DocumentosPage() {
  const documentos = [
    { nome: "Contrato de Crédito", status: "Assinado", data: "15/03/2024" },
    { nome: "KYC Completo", status: "Aprovado", data: "10/03/2024" },
    { nome: "Documentação da Obra", status: "Pendente", data: "-" },
    { nome: "Apólice de Seguro", status: "Ativo", data: "01/03/2024" },
    { nome: "Extrato de Crédito", status: "Disponível", data: "Atualizado" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Documentos</h1>

      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 text-left text-slate-300 font-bold">Documento</th>
              <th className="px-6 py-4 text-left text-slate-300 font-bold">Status</th>
              <th className="px-6 py-4 text-left text-slate-300 font-bold">Data</th>
              <th className="px-6 py-4 text-left text-slate-300 font-bold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {documentos.map((doc) => (
              <tr
                key={doc.nome}
                className="border-b border-slate-800 hover:bg-slate-800/50 transition"
              >
                <td className="px-6 py-4 text-white">{doc.nome}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold ${
                      doc.status === "Assinado" || doc.status === "Aprovado" || doc.status === "Ativo"
                        ? "bg-green-400/20 text-green-400"
                        : "bg-yellow-400/20 text-yellow-400"
                    }`}
                  >
                    {doc.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400">{doc.data}</td>
                <td className="px-6 py-4">
                  <button className="text-green-400 hover:text-green-300 text-sm font-bold">
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
