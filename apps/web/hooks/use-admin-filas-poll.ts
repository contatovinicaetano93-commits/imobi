"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi, type AdminFilasResponse } from "@/lib/api";

const DEFAULT_INTERVAL_MS = 20_000;

export function useAdminFilasPoll(
  intervalMs = DEFAULT_INTERVAL_MS,
  enabled = true,
) {
  const [filas, setFilas] = useState<AdminFilasResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const prevSig = useRef<string>("");

  const recarregar = useCallback(async () => {
    try {
      const data = await adminApi.filas();
      setFilas(data);
      setErro(null);
      return data;
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar filas");
      return null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const tick = async () => {
      const data = await recarregar();
      if (cancelled || !data) return;
      const sig = [
        data.kycPendentes,
        data.propostasPublicasPendentes,
        data.viabilidadePendentes,
        data.obrasAguardandoHomologacao,
        data.liberacoesAguardandoPagamento,
        data.etapasAguardandoVistoria,
      ].join(":");
      prevSig.current = sig;
    };

    void tick();
    const id = setInterval(() => void tick(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, intervalMs, recarregar]);

  return { filas, erro, recarregar };
}

/** Dispara callback quando totais das filas mudam (útil para refetch de listas). */
export function useAdminFilasOnChange(
  onChange: () => void,
  intervalMs = DEFAULT_INTERVAL_MS,
  enabled = true,
) {
  const sigRef = useRef<string>("");

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const data = await adminApi.filas();
        if (cancelled) return;
        const sig = [
          data.kycPendentes,
          data.propostasPublicasPendentes,
          data.viabilidadePendentes,
          data.obrasAguardandoHomologacao,
          data.liberacoesAguardandoPagamento,
          data.etapasAguardandoVistoria,
        ].join(":");
        if (sigRef.current && sigRef.current !== sig) {
          onChange();
        }
        sigRef.current = sig;
      } catch {
        /* polling silencioso */
      }
    };

    void poll();
    const id = setInterval(() => void poll(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, intervalMs, onChange]);
}
