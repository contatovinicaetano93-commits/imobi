"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function DashboardSubError({
  error,
  reset,
}: {
  error: Error & { digest?: string; status?: number };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[page error]", error);
  }, [error]);

  const status = (error as any).status;
  const is403 = status === 403 || error.message?.toLowerCase().includes("permissão");
  const is404 = status === 404 || error.message?.toLowerCase().includes("não encontrado");

  if (is403) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="p-4 bg-yellow-50 rounded-2xl mb-4">
          <AlertTriangle className="w-10 h-10 text-yellow-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Sem permissão</h2>
        <p className="text-sm text-gray-500 max-w-xs mb-6">
          Você não tem acesso a esta página. Verifique se está logado com o perfil correto.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
        >
          <Home className="w-4 h-4" />
          Ir ao início
        </a>
      </div>
    );
  }

  if (is404) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="p-4 bg-blue-50 rounded-2xl mb-4">
          <AlertTriangle className="w-10 h-10 text-blue-400" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Não encontrado</h2>
        <p className="text-sm text-gray-500 max-w-xs mb-6">
          O recurso que você procura não existe ou foi removido.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
        >
          <Home className="w-4 h-4" />
          Voltar ao início
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="p-4 bg-red-50 rounded-2xl mb-4">
        <AlertTriangle className="w-10 h-10 text-red-400" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">Algo deu errado</h2>
      <p className="text-sm text-gray-500 max-w-xs mb-6">
        {error.message || "Ocorreu um erro inesperado. Tente novamente."}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
      >
        <RefreshCw className="w-4 h-4" />
        Tentar novamente
      </button>
    </div>
  );
}
