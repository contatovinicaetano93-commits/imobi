"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { authApi } from "@/lib/api";

const WA = "5511993455589";

export default function RedefinirSenhaPage() {
  const params = useParams();
  const token = params.token as string;

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLink, setErroLink] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const validar = (): string | null => {
    if (novaSenha.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
    if (novaSenha !== confirmar) return "As senhas não coincidem.";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    const msg = validar();
    if (msg) { setErro(msg); return; }
    setEnviando(true);
    try {
      await authApi.redefinirSenha(token, novaSenha);
      setSucesso(true);
    } catch (e) {
      if (e instanceof Error && (e.message.includes("inválido") || e.message.includes("expirado") || (e as { status?: number }).status === 400 || (e as { status?: number }).status === 404)) {
        setErroLink(true);
      } else {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #1B4FD8 0%, #1e40af 100%)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
        <div className="h-1.5 w-full bg-brand-600" />

        <div className="px-6 py-6 space-y-5">
          <div className="text-center">
            <span className="text-2xl font-bold text-brand-700">imbobi</span>
            <p className="text-gray-400 text-xs mt-0.5">Redefinir senha</p>
          </div>

          {erroLink ? (
            <div className="space-y-4">
              <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl px-4 py-4 border border-red-100">
                Link inválido ou expirado.
              </p>
              <a
                href="/esqueci-senha"
                className="block text-center text-xs font-semibold hover:underline"
                style={{ color: "#16a34a" }}
              >
                Solicitar novo link
              </a>
            </div>
          ) : sucesso ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-700 text-center bg-green-50 rounded-xl px-4 py-4 border border-green-100">
                Senha redefinida! Faça login com sua nova senha.
              </p>
              <a
                href="/login"
                className="block w-full text-center text-white font-bold py-3 rounded-xl transition-all text-sm hover:opacity-90 active:scale-95"
                style={{ backgroundColor: "#16a34a" }}
              >
                Ir para o login
              </a>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
                  Nova senha
                </label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Mín. 8 caracteres"
                  required
                  className={inputCls(!!erro && novaSenha.length < 8)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
                  Confirmar nova senha
                </label>
                <input
                  type="password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                  className={inputCls(!!erro && novaSenha !== confirmar)}
                />
              </div>

              {erro && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {erro}
                </p>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="w-full text-white font-bold py-3 rounded-xl transition-all text-sm disabled:opacity-60 hover:opacity-90 active:scale-95"
                style={{ backgroundColor: "#16a34a" }}
              >
                {enviando ? "Redefinindo..." : "Redefinir senha"}
              </button>

              <p className="text-center text-xs text-gray-400">
                <a
                  href="/login"
                  className="font-semibold hover:underline"
                  style={{ color: "#16a34a" }}
                >
                  ← Voltar ao login
                </a>
              </p>
            </form>
          )}
        </div>

        <div className="h-1 w-full bg-brand-500 opacity-40" />
      </div>

      <a
        href={`https://wa.me/${WA}?text=Olá!%20Preciso%20de%20ajuda%20com%20o%20imbobi.`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco no WhatsApp"
        className="fixed bottom-6 right-6 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
        style={{ backgroundColor: "#25D366" }}
      >
        <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}

const inputCls = (hasError: boolean) =>
  `w-full border rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-green-400 transition ${
    hasError ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:bg-white"
  }`;
