"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Mail, Smartphone, Monitor, Save, Loader2, SlidersHorizontal } from "lucide-react";
import { PanelSection } from "@/components/dashboard/PanelSection";
import { DashboardPanelShell } from "@/components/dashboard/DashboardPanelShell";
import {
  TIPOS_EVENTO_NOTIFICACAO,
  LABELS_EVENTO_NOTIFICACAO,
  criarPreferenciasPadrao,
  type PreferenciasNotificacao,
  type TipoEventoNotificacao,
} from "@imbobi/schemas";
import { usuariosApi, type PreferenciaCanal } from "@/lib/api";

type Canal = keyof PreferenciaCanal;

const CANAIS: { key: Canal; label: string; icon: typeof Mail }[] = [
  { key: "email", label: "E-mail", icon: Mail },
  { key: "push", label: "Push", icon: Smartphone },
  { key: "inApp", label: "In-app", icon: Monitor },
];

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#1B4FD8] focus:ring-offset-2 ${
        checked ? "bg-[#1B4FD8]" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function PreferenciasNotificacaoPage() {
  const [prefs, setPrefs] = useState<PreferenciasNotificacao>(() => criarPreferenciasPadrao());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    usuariosApi
      .obterPreferencias()
      .then((data) => setPrefs({ ...criarPreferenciasPadrao(), ...data }))
      .catch(() => setPrefs(criarPreferenciasPadrao()))
      .finally(() => setLoading(false));
  }, []);

  const setCanal = useCallback(
    (tipo: TipoEventoNotificacao, canal: Canal, valor: boolean) => {
      setPrefs((prev) => ({
        ...prev,
        [tipo]: { ...prev[tipo], [canal]: valor },
      }));
    },
    []
  );

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    try {
      const saved = await usuariosApi.salvarPreferencias(prefs);
      setPrefs(saved);
      setFeedback({ type: "ok", msg: "Preferências salvas com sucesso." });
    } catch {
      setFeedback({ type: "err", msg: "Não foi possível salvar. Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  const NOTIF_PREFS_PANELS = [{ id: "notif-prefs-canais", priority: "primary" as const }];

  return (
    <DashboardPanelShell
      panels={NOTIF_PREFS_PANELS}
      maxWidth="md"
      content={
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link
                href="/dashboard/notificacoes"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3"
              >
                <ArrowLeft size={14} />
                Voltar às notificações
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <Bell className="w-6 h-6 text-[#1B4FD8]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Preferências de notificação</h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Escolha como deseja ser avisado por tipo de evento
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B4FD8] text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>

          {feedback && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                feedback.type === "ok"
                  ? "bg-green-50 text-green-800 border border-green-100"
                  : "bg-red-50 text-red-700 border border-red-100"
              }`}
            >
              {feedback.msg}
            </div>
          )}

          <PanelSection
            id="notif-prefs-canais"
            title="Canais por evento"
            icon={<SlidersHorizontal className="w-4 h-4 text-[#1B4FD8]" />}
            priority="primary"
            summary="E-mail, push e in-app por tipo de alerta"
          >
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-100">
                <div className="hidden sm:grid grid-cols-[1fr_repeat(3,5rem)] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span>Evento</span>
                  {CANAIS.map((c) => (
                    <span key={c.key} className="text-center">
                      {c.label}
                    </span>
                  ))}
                </div>
                <div className="divide-y divide-gray-50 bg-white">
                  {TIPOS_EVENTO_NOTIFICACAO.map((tipo) => (
                    <div
                      key={tipo}
                      className="px-4 sm:px-5 py-4 sm:grid sm:grid-cols-[1fr_repeat(3,5rem)] sm:gap-4 sm:items-center"
                    >
                      <div className="mb-3 sm:mb-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {LABELS_EVENTO_NOTIFICACAO[tipo]}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{tipo}</p>
                      </div>
                      <div className="flex sm:contents gap-6 sm:gap-0">
                        {CANAIS.map((c) => (
                          <div
                            key={c.key}
                            className="flex sm:flex-col items-center gap-2 sm:justify-center"
                          >
                            <span className="sm:hidden text-xs text-gray-500 flex items-center gap-1">
                              <c.icon size={12} />
                              {c.label}
                            </span>
                            <Toggle
                              checked={prefs[tipo]?.[c.key] ?? true}
                              onChange={(v) => setCanal(tipo, c.key, v)}
                              label={`${LABELS_EVENTO_NOTIFICACAO[tipo]} — ${c.label}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </PanelSection>
        </>
      }
    />
  );
}
