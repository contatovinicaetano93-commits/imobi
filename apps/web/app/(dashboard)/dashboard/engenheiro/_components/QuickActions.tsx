"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Edit2, Loader2, AlertCircle } from "lucide-react";
import type { Visita } from "@/lib/api";
import { engenheirosApi } from "@/lib/api";

interface QuickActionsProps {
  visita: Visita;
  onStatusUpdate: (newStatus: string) => void;
}

export function QuickActions({ visita, onStatusUpdate }: QuickActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState(visita.dataAgendada.split("T")[0]);
  const [observacoes, setObservacoes] = useState(visita.observacoes || "");

  const handleMarkAsComplete = async () => {
    setIsLoading(true);
    try {
      await engenheirosApi.atualizarValidacao(visita.visitaId, {
        status: "CONCLUIDA",
      } as any);
      setMessage({ type: "success", text: "Visita marcada como concluída!" });
      onStatusUpdate("CONCLUIDA");
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao atualizar status",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReschedule = async () => {
    setIsLoading(true);
    try {
      await engenheirosApi.atualizarValidacao(visita.visitaId, {
        dataAgendada: new Date(newDate).toISOString(),
        observacoes,
      } as any);
      setMessage({ type: "success", text: "Visita reagendada com sucesso!" });
      setShowRescheduleModal(false);
      onStatusUpdate("AGENDADA");
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao reagendar",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Ações Rápidas</h3>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p
            className={`text-sm font-semibold ${
              message.type === "success" ? "text-green-900" : "text-red-900"
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {visita.status !== "CONCLUIDA" && (
        <button
          onClick={handleMarkAsComplete}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold transition-colors text-sm sm:text-base"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Marcar como Concluída
            </>
          )}
        </button>
      )}

      {visita.status !== "CONCLUIDA" && (
        <button
          onClick={() => setShowRescheduleModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-[#1B4FD8] text-[#1B4FD8] rounded-lg hover:bg-blue-50 font-semibold transition-colors text-sm sm:text-base"
        >
          <Clock className="w-5 h-5" />
          Reagendar Visita
        </button>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Reagendar Visita</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Data
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Motivo do reagendamento..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleReschedule}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-[#1B4FD8] text-white rounded-lg hover:bg-blue-800 disabled:bg-gray-400 font-semibold text-sm"
              >
                {isLoading ? "Processando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
