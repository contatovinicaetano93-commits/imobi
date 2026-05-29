"use client";

import { useState, useEffect } from "react";
import type { EtapaAuditEntry, KycAuditEntry } from "@/lib/api";
import { CheckCircle2, XCircle, Edit3, Clock, User, Mail, AlertCircle } from "lucide-react";

type AuditEntry = EtapaAuditEntry | KycAuditEntry;

interface ApprovalAuditTrailProps {
  auditLogs: AuditEntry[];
  loading?: boolean;
  error?: string | null;
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

function getStatusBadgeColor(acaoTipo: string): string {
  switch (acaoTipo) {
    case "APROVADA":
    case "APROVADO":
      return "bg-green-100 text-green-800 border-green-300";
    case "REJEITADA":
    case "REJEITADO":
      return "bg-red-100 text-red-800 border-red-300";
    case "EDITADA":
      return "bg-blue-100 text-blue-800 border-blue-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

function getStatusIcon(acaoTipo: string) {
  switch (acaoTipo) {
    case "APROVADA":
    case "APROVADO":
      return <CheckCircle2 className="w-6 h-6" />;
    case "REJEITADA":
    case "REJEITADO":
      return <XCircle className="w-6 h-6" />;
    case "EDITADA":
      return <Edit3 className="w-6 h-6" />;
    default:
      return <Clock className="w-6 h-6" />;
  }
}

function getStatusLabel(acaoTipo: string): string {
  const labels: Record<string, string> = {
    APROVADA: "Aprovada",
    REJEITADA: "Rejeitada",
    APROVADO: "Aprovado",
    REJEITADO: "Rejeitado",
    EDITADA: "Editada",
  };
  return labels[acaoTipo] || acaoTipo;
}

export function ApprovalAuditTrail({
  auditLogs,
  loading = false,
  error = null,
}: ApprovalAuditTrailProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-4">Histórico de Aprovações</h2>
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
        <h2 className="font-bold text-gray-900 mb-4">Histórico de Aprovações</h2>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!auditLogs || auditLogs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-4">Histórico de Aprovações</h2>
        <div className="text-gray-500 text-center py-8">
          Nenhuma ação registrada ainda
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-gray-900 text-lg">Histórico de Aprovações</h2>
        <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
          {auditLogs.length} evento{auditLogs.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-200 via-gray-200 to-transparent" />

        <div className="space-y-6 relative z-10">
          {auditLogs.map((log, idx) => {
            const badgeColor = getStatusBadgeColor(log.acaoTipo);
            const icon = getStatusIcon(log.acaoTipo);
            const label = getStatusLabel(log.acaoTipo);
            const isLastItem = idx === auditLogs.length - 1;
            const observacao =
              "observacoes" in log
                ? log.observacoes
                : "motivo" in log
                  ? log.motivo
                  : null;

            const iconColor =
              log.acaoTipo === "APROVADA" || log.acaoTipo === "APROVADO"
                ? "text-green-600"
                : log.acaoTipo === "REJEITADA" ||
                    log.acaoTipo === "REJEITADO"
                  ? "text-red-600"
                  : "text-blue-600";

            return (
              <div key={log.auditId} className="flex gap-4">
                {/* Timeline dot with icon */}
                <div
                  className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-bold text-white z-20 relative bg-white border-2 ${
                    log.acaoTipo === "APROVADA" || log.acaoTipo === "APROVADO"
                      ? "border-green-600 bg-green-50"
                      : log.acaoTipo === "REJEITADA" ||
                          log.acaoTipo === "REJEITADO"
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}
                      >
                        {label}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatDate(log.criadoEm)}
                      </div>
                    </div>

                    {/* Manager info */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-600" />
                          <span className="font-semibold text-gray-900">{log.gerenciador}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-600" />
                          <span className="text-gray-600">{log.gerenciadorEmail}</span>
                        </div>
                      </div>
                    </div>

                    {/* Reason/Observation */}
                    {observacao && (
                      <div className={`rounded-lg p-4 text-sm border ${
                        log.acaoTipo === "REJEITADA" ||
                        log.acaoTipo === "REJEITADO"
                          ? "bg-red-50 border-red-200"
                          : "bg-blue-50 border-blue-200"
                      }`}>
                        <p className={`font-semibold mb-2 ${
                          log.acaoTipo === "REJEITADA" ||
                          log.acaoTipo === "REJEITADO"
                            ? "text-red-900"
                            : "text-blue-900"
                        }`}>
                          {log.acaoTipo === "REJEITADA" ||
                          log.acaoTipo === "REJEITADO"
                            ? "Motivo da rejeição:"
                            : "Observações:"}
                        </p>
                        <p className="text-gray-700 whitespace-pre-wrap">{observacao}</p>
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
