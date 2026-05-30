export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Bem-vindo</h1>
          <p className="text-slate-400 mb-6">Acesse sua conta IMOBI</p>

          <form className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Email</label>
              <input
                type="email"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-green-400 focus:outline-none"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Senha</label>
              <input
                type="password"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-green-400 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <button className="w-full bg-green-400 text-slate-950 font-bold py-2 rounded-lg hover:bg-green-500 transition">
              Entrar
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            Não tem conta? <a href="#" className="text-green-400 hover:underline">Cadastre-se</a>
          </p>
        </div>
      </div>
    </div>
  );
}
