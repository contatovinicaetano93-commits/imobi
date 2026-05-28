"use client";

import { useState, useEffect } from "react";
import type { EtapaAuditEntry, KycAuditEntry } from "@/lib/api";

type AuditEntry = EtapaAuditEntry | KycAuditEntry;

interface ApprovalAuditTrailProps {
  auditLogs: AuditEntry[];
  loading?: boolean;
  error?: string | null;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
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

function getStatusIcon(acaoTipo: string): string {
  switch (acaoTipo) {
    case "APROVADA":
    case "APROVADO":
      return "✓";
    case "REJEITADA":
    case "REJEITADO":
      return "✕";
    case "EDITADA":
      return "✎";
    default:
      return "•";
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
        <div className="text-gray-500 text-center py-8">Carregando...</div>
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
      <h2 className="font-bold text-gray-900 mb-6">Histórico de Aprovações</h2>

      <div className="space-y-6">
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

          return (
            <div key={log.auditId} className="relative">
              {/* Timeline line */}
              {!isLastItem && (
                <div className="absolute left-6 top-12 w-1 h-12 bg-gray-200" />
              )}

              <div className="flex gap-4">
                {/* Timeline dot with icon */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10 ${
                    log.acaoTipo === "APROVADA" || log.acaoTipo === "APROVADO"
                      ? "bg-green-600"
                      : log.acaoTipo === "REJEITADA" ||
                          log.acaoTipo === "REJEITADO"
                        ? "bg-red-600"
                        : "bg-blue-600"
                  }`}
                >
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${badgeColor}`}
                    >
                      {label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(log.criadoEm)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-700 mb-2">
                    <p className="font-medium">{log.gerenciador}</p>
                    <p className="text-xs text-gray-500">{log.gerenciadorEmail}</p>
                  </div>

                  {observacao && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 border border-gray-200">
                      <p className="font-semibold text-gray-900 mb-1">
                        {log.acaoTipo === "REJEITADA" ||
                        log.acaoTipo === "REJEITADO"
                          ? "Motivo da rejeição:"
                          : "Observações:"}
                      </p>
                      <p>{observacao}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
