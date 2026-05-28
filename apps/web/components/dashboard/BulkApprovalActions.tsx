"use client";

import { useState } from "react";
import { managerApi } from "@/lib/api";

export type BulkApprovalActionsProps = {
  selectedEtapas: string[];
  onSuccess: () => void;
  onError: (message: string) => void;
  isDisabled: boolean;
};

const REJECTION_PRESETS = [
  "Documentação incompleta",
  "GPS inválido",
  "Obra parada",
  "Fotos com qualidade inadequada",
  "Outro motivo",
];

export function BulkApprovalActions({
  selectedEtapas,
  onSuccess,
  onError,
  isDisabled,
}: BulkApprovalActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

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
      setShowConfirm(null);
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Erro ao aprovar etapas"
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
      // Rejecting in parallel
      await Promise.all(
        selectedEtapas.map((etapaId) =>
          managerApi.rejeitarEtapa(etapaId, rejectReason)
        )
      );
      onSuccess();
      setShowConfirm(null);
      setRejectReason("");
      setSelectedPreset(null);
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Erro ao rejeitar etapas"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePresetSelect = (preset: string) => {
    if (preset === "Outro motivo") {
      setSelectedPreset(preset);
      setRejectReason("");
    } else {
      setSelectedPreset(preset);
      setRejectReason(preset);
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
            {isProcessing ? "Processando..." : "Aprovar Selecionadas"}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm === "approve" && (
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

      {/* Rejection Modal */}
      {showConfirm === "reject" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Rejeitar em lote
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Informe o motivo da rejeição para {selectedEtapas.length} etapa
              {selectedEtapas.length !== 1 ? "s" : ""}:
            </p>

            {/* Preset Buttons */}
            <div className="mb-4 space-y-2">
              <p className="text-xs font-medium text-gray-700">Motivos rápidos:</p>
              <div className="grid grid-cols-2 gap-2">
                {REJECTION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handlePresetSelect(preset)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      selectedPreset === preset
                        ? "bg-red-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    disabled={isProcessing}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Textarea */}
            <div className="mb-6">
              <label htmlFor="reject-reason" className="text-xs font-medium text-gray-700 block mb-2">
                {selectedPreset === "Outro motivo" ? "Informe o motivo:" : "Ou customize o motivo:"}
              </label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (selectedPreset !== "Outro motivo") {
                    setSelectedPreset(null);
                  }
                }}
                placeholder="Descreva o motivo da rejeição..."
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none flex-1 min-h-[80px]"
                rows={3}
                disabled={isProcessing}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirm(null);
                  setRejectReason("");
                  setSelectedPreset(null);
                }}
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
