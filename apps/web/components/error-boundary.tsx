"use client";

import { useEffect } from "react";

export function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Algo deu errado</h2>
          <p className="text-sm text-gray-500 mt-1">
            {error.message || "Ocorreu um erro inesperado. Tente novamente."}
          </p>
        </div>
        <div className="flex gap-2 pt-4">
          <button
            onClick={reset}
            className="flex-1 px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition"
          >
            Tentar novamente
          </button>
          <a
            href="/dashboard"
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition text-center"
          >
            Voltar
          </a>
        </div>
      </div>
    </div>
  );
}
