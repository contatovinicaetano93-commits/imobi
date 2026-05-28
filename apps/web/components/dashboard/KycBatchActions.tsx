"use client";

import { useState } from "react";
import { managerApi } from "@/lib/api";

export type KycBatchActionsProps = {
  selectedDocs: string[];
  onSuccess: () => void;
  onError: (message: string) => void;
  isDisabled: boolean;
};

export function KycBatchActions({
  selectedDocs,
  onSuccess,
  onError,
  isDisabled,
}: KycBatchActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleBulkApprove = async () => {
    setIsProcessing(true);
    try {
      await Promise.all(
        selectedDocs.map((docId) => managerApi.aprovarKyc(docId))
      );
      onSuccess();
      setShowConfirm(null);
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Erro ao aprovar documentos"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (!rejectReason.trim()) {
      onError("Motivo da rejeição é obrigatório");
      return;
    }

    setIsProcessing(true);
    try {
      await Promise.all(
        selectedDocs.map((docId) => managerApi.rejeitarKyc(docId, rejectReason))
      );
      onSuccess();
      setShowConfirm(null);
      setRejectReason("");
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Erro ao rejeitar documentos"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedDocs.length === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 left-6 right-6 bg-white rounded-2xl border border-gray-200 shadow-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
              {selectedDocs.length}
            </div>
            <span className="text-sm font-medium text-gray-700">
              documento{selectedDocs.length !== 1 ? "s" : ""} selecionado
              {selectedDocs.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfirm(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isProcessing || isDisabled}
          >
            Cancelar
          </button>
          <button
            onClick={() => setShowConfirm("reject")}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            disabled={isProcessing || isDisabled}
          >
            Rejeitar
          </button>
          <button
            onClick={() => setShowConfirm("approve")}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            disabled={isProcessing || isDisabled}
          >
            {isProcessing ? "Processando..." : "Aprovar Selecionados"}
          </button>
        </div>
      </div>

      {/* Approval Confirmation Modal */}
      {showConfirm === "approve" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Confirmar aprovação em lote
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Você está prestes a aprovar {selectedDocs.length} documento
              {selectedDocs.length !== 1 ? "s" : ""}. Esta ação é irreversível.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkApprove}
                className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled={isProcessing}
              >
                {isProcessing ? "Aprovando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Confirmation Modal */}
      {showConfirm === "reject" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Rejeitar em lote
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Informe o motivo da rejeição para {selectedDocs.length} documento
              {selectedDocs.length !== 1 ? "s" : ""}:
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Exemplo: Documentos ilegíveis, Dados inválidos, etc."
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
              disabled={isProcessing}
            />

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkReject}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={isProcessing || !rejectReason.trim()}
              >
                {isProcessing ? "Rejeitando..." : "Confirmar Rejeição"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
