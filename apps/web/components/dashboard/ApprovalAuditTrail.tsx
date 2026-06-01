"use client";

import { useState, useEffect } from "react";
import type { EtapaAuditEntry, KycAuditEntry } from "@/lib/api";
import { CheckCircle2, XCircle, Edit3, Clock, User, Mail, AlertCircle } from "lucide-react";

export type AuditEntry = EtapaAuditEntry | KycAuditEntry;

export interface ApprovalAuditTrailProps {
  auditLogs: AuditEntry[];
  loading?: boolean;
  error?: string | null;
  title?: string;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getStatusBadgeColor(action: string): string {
  switch (action) {
    case "approve":
      return "bg-green-100 text-green-800 border-green-300";
    case "reject":
      return "bg-red-100 text-red-800 border-red-300";
    case "update":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "create":
      return "bg-gray-100 text-gray-800 border-gray-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

function getStatusIcon(action: string) {
  switch (action) {
    case "approve":
      return <CheckCircle2 className="w-6 h-6" />;
    case "reject":
      return <XCircle className="w-6 h-6" />;
    case "update":
      return <Edit3 className="w-6 h-6" />;
    case "create":
      return <Clock className="w-6 h-6" />;
    default:
      return <Clock className="w-6 h-6" />;
  }
}

function getStatusLabel(action: string): string {
  const labels: Record<string, string> = {
    approve: "Aprovado",
    reject: "Rejeitado",
    update: "Editado",
    create: "Criado",
  };
  return labels[action] || action;
}

export function ApprovalAuditTrail({
  auditLogs,
  loading = false,
  error = null,
  title = "Histórico de Aprovações",
}: ApprovalAuditTrailProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-4">{title}</h2>
        <div className="text-gray-500 text-center py-8">
          <div className="inline-block animate-spin">
            <Clock className="w-5 h-5" />
          </div>
          <p className="mt-2">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-4">{title}</h2>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!auditLogs || auditLogs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-4">{title}</h2>
        <div className="text-gray-500 text-center py-8">
          Nenhuma ação registrada ainda
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
        <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1 rounded-full w-fit">
          {auditLogs.length} evento{auditLogs.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-200 via-gray-200 to-transparent" />

        <div className="space-y-6 relative z-10">
          {auditLogs.map((log, idx) => {
            const badgeColor = getStatusBadgeColor(log.action);
            const icon = getStatusIcon(log.action);
            const label = getStatusLabel(log.action);
            const isLastItem = idx === auditLogs.length - 1;

            const iconColor =
              log.action === "approve"
                ? "text-green-600"
                : log.action === "reject"
                  ? "text-red-600"
                  : "text-blue-600";

            return (
              <div key={log.id} className="flex gap-4">
                {/* Timeline dot with icon */}
                <div
                  className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-bold text-white z-20 relative bg-white border-2 ${
                    log.action === "approve"
                      ? "border-green-600 bg-green-50"
                      : log.action === "reject"
                        ? "border-red-600 bg-red-50"
                        : "border-blue-600 bg-blue-50"
                  }`}
                >
                  <span className={iconColor}>{icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 pt-1.5 pb-6">
                  <div className="space-y-2">
                    {/* Action and timestamp header */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold border w-fit ${badgeColor}`}
                      >
                        {label}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{formatDate(log.timestamp)}</span>
                      </div>
                    </div>

                    {/* Manager info */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <span className="font-semibold text-gray-900 truncate">{log.usuario.nome}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <span className="text-gray-600 truncate">{log.usuario.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Reason/Observation */}
                    {log.observacao && (
                      <div className={`rounded-lg p-4 text-sm border ${
                        log.action === "reject"
                          ? "bg-red-50 border-red-200"
                          : "bg-blue-50 border-blue-200"
                      }`}>
                        <p className={`font-semibold mb-2 ${
                          log.action === "reject"
                            ? "text-red-900"
                            : "text-blue-900"
                        }`}>
                          {log.action === "reject"
                            ? "Motivo da rejeição:"
                            : "Observações:"}
                        </p>
                        <p className="text-gray-700 whitespace-pre-wrap">{log.observacao}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary footer */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          {auditLogs.length === 1
            ? "Uma ação registrada"
            : `${auditLogs.length} ações registradas no histórico`
          }
        </p>
      </div>
    </div>
  );
}
