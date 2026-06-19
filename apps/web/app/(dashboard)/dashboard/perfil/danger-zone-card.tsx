"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { usuariosApi } from "@/lib/api";

export function DangerZoneCard() {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      await usuariosApi.deletarConta();
      setDone(true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao solicitar exclusão.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
          <Trash2 className="w-5 h-5 text-red-500" />
        </div>
        <p className="font-semibold text-red-800 mb-1">Solicitação registrada</p>
        <p className="text-sm text-red-700">
          Sua conta será excluída em até 72 horas conforme a LGPD.
          Redirecionando...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <h2 className="text-base font-bold text-red-700">Zona de Perigo</h2>
      </div>

      <p className="text-sm text-gray-600 mb-5 leading-relaxed">
        Ao excluir sua conta, todos os seus dados pessoais serão removidos de forma permanente
        conforme a <strong>LGPD (Art. 18, VI)</strong>. Esta ação não pode ser desfeita.
        Créditos e obrigações financeiras em aberto podem continuar sujeitos às obrigações legais.
      </p>

      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="border border-red-300 text-red-600 font-semibold py-2.5 px-4 rounded-xl hover:bg-red-50 transition-colors text-sm w-full"
        >
          Solicitar exclusão da minha conta
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <p className="text-sm font-semibold text-red-800 mb-1">Tem certeza absoluta?</p>
            <p className="text-xs text-red-700">
              Esta ação iniciará o processo de exclusão permanente dos seus dados.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-600 bg-red-50 rounded-lg p-3 border border-red-200">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setConfirm(false); setError(null); }}
              disabled={loading}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              aria-busy={loading}
              className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-xl hover:bg-red-700 transition-colors text-sm disabled:opacity-60"
            >
              {loading ? "Processando..." : "Sim, excluir minha conta"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
