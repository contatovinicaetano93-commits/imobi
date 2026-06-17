"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  variant: "error" | "offline";
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
};

export function ManagerListBanner({ variant, message, onRetry, retrying }: Props) {
  const isError = variant === "error";
  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
        isError
          ? "bg-red-50 border-red-200"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <AlertTriangle
          className={`w-5 h-5 shrink-0 mt-0.5 ${isError ? "text-red-600" : "text-amber-600"}`}
        />
        <p className={`text-sm font-medium ${isError ? "text-red-800" : "text-amber-800"}`}>
          {message ??
            (isError
              ? "Não foi possível carregar os dados. Verifique sua sessão ou tente novamente."
              : "API indisponível — conecte-se à staging ou inicie a API local.")}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
            isError
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-amber-600 text-white hover:bg-amber-700"
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
