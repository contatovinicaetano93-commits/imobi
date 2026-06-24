"use client";

import { RefreshCw } from "lucide-react";

const NAVY = "#0C1A3D";

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function JornadaError({
  message = "Não foi possível carregar seu próximo passo. A API pode estar acordando — aguarde e tente de novo.",
  onRetry,
}: Props) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-red-600">Conexão com o servidor</p>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <button
          type="button"
          onClick={() => (onRetry ? onRetry() : window.location.reload())}
          className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white"
          style={{ background: NAVY }}
        >
          <RefreshCw size={16} />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
