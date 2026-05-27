"use client";

import { useState } from "react";
import { managerApi } from "@/lib/api";

export type BulkApprovalActionsProps = {
  selectedEtapas: string[];
  onSuccess: () => void;
  onError: (message: string) => void;
  isDisabled: boolean;
};

export function BulkApprovalActions({
  selectedEtapas,
  onSuccess,
  onError,
  isDisabled,
}: BulkApprovalActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleBulkApprove = async () => {
    setIsProcessing(true);
    try {
      // Approving in parallel
      await Promise.all(
        selectedEtapas.map((etapaId) =>
          managerApi.aprovarEtapa(etapaId, "Aprovação em lote")
        )
      );
      onSuccess();
      setShowConfirm(false);
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Erro ao aprovar etapas"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedEtapas.length === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 left-6 right-6 bg-white rounded-2xl border border-gray-200 shadow-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
              {selectedEtapas.length}
            </div>
            <span className="text-sm font-medium text-gray-700">
              etapa{selectedEtapas.length !== 1 ? "s" : ""} selecionada
              {selectedEtapas.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfirm(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isProcessing || isDisabled}
          >
            Cancelar
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            disabled={isProcessing || isDisabled}
          >
            {isProcessing ? "Processando..." : "Aprovar Selecionadas"}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Confirmar aprovação em lote
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Você está prestes a aprovar {selectedEtapas.length} etapa
              {selectedEtapas.length !== 1 ? "s" : ""}. Esta ação é irreversível.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
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
    </>
  );
}
