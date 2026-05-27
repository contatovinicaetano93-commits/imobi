"use client";

import { CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";

interface KYCStatusBadgeProps {
  status: "PENDENTE" | "APROVADO" | "REPROVADO" | "EM_ANALISE";
  compact?: boolean;
}

export function KYCStatusBadge({ status, compact = false }: KYCStatusBadgeProps) {
  const config = {
    PENDENTE: {
      icon: Clock,
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-900",
      label: "Pendente",
      description: "Aguardando análise",
    },
    APROVADO: {
      icon: CheckCircle2,
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-900",
      label: "Aprovado",
      description: "KYC confirmado",
    },
    REPROVADO: {
      icon: XCircle,
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-900",
      label: "Reprovado",
      description: "Documentação insuficiente",
    },
    EM_ANALISE: {
      icon: AlertCircle,
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-900",
      label: "Em Análise",
      description: "Sendo verificado",
    },
  };

  const config_atual = config[status];
  const Icon = config_atual.icon;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${config_atual.bg} ${config_atual.border} ${config_atual.text}`}
      >
        <Icon className="w-4 h-4" />
        {config_atual.label}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 flex items-start gap-3 ${config_atual.bg} ${config_atual.border}`}
    >
      <Icon className={`w-6 h-6 flex-shrink-0 ${config_atual.text}`} />
      <div className="flex-1">
        <p className={`font-semibold text-sm sm:text-base ${config_atual.text}`}>
          {config_atual.label}
        </p>
        <p className={`text-xs sm:text-sm mt-1 ${config_atual.text} opacity-75`}>
          {config_atual.description}
        </p>
      </div>
    </div>
  );
}
