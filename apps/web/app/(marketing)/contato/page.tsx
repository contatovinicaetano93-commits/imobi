export default function ContatoPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">Contato</h1>
        <p className="text-slate-400 mb-12">
          Tem dúvidas? Nosso time está pronto para ajudar
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
            <h3 className="text-green-400 font-bold mb-2">Email</h3>
            <p className="text-slate-300">contato@imobi.com.br</p>
          </div>

          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
            <h3 className="text-green-400 font-bold mb-2">Telefone</h3>
            <p className="text-slate-300">(11) 3000-0000</p>
          </div>
        </div>

        <form className="bg-slate-900 rounded-lg border border-slate-800 p-8 space-y-4">
          <div>
            <label className="block text-slate-300 mb-2">Nome</label>
            <input
              type="text"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-green-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-2">Email</label>
            <input
              type="email"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-green-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-2">Mensagem</label>
            <textarea
              rows={5}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-green-400 focus:outline-none"
            />
          </div>

          <button className="w-full bg-green-400 text-slate-950 font-bold py-2 rounded-lg hover:bg-green-500 transition">
            Enviar Mensagem
          </button>
        </form>
      </div>
    </div>
  );
}
