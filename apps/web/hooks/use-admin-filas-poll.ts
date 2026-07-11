"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi, type AdminFilasResponse } from "@/lib/api";

const DEFAULT_INTERVAL_MS = 45_000;
const BACKOFF_AFTER_ERROR_MS = 60_000;

function filasSignature(data: AdminFilasResponse): string {
  return [
    data.documentosPendentes,
    data.obrasParaHomologar,
    data.tranchesParaLiberar,
  ].join(":");
}

let filasInflight: Promise<AdminFilasResponse | null> | null = null;
let filasBackoffUntil = 0;

async function fetchFilasDeduped(): Promise<AdminFilasResponse | null> {
  if (Date.now() < filasBackoffUntil) return null;
  if (filasInflight) return filasInflight;

  filasInflight = adminApi
    .filas()
    .then((data) => {
      filasBackoffUntil = 0;
      return data;
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Too Many Requests") || msg.includes("Throttler")) {
        filasBackoffUntil = Date.now() + BACKOFF_AFTER_ERROR_MS;
      }
      return null;
    })
    .finally(() => {
      filasInflight = null;
    });

  return filasInflight;
}

export function useAdminFilasPoll(
  intervalMs = DEFAULT_INTERVAL_MS,
  enabled = true,
) {
  const [filas, setFilas] = useState<AdminFilasResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    const data = await fetchFilasDeduped();
    if (data) {
      setFilas(data);
      setErro(null);
    } else if (Date.now() < filasBackoffUntil) {
      setErro("Muitas requisições — pausa automática de 1 minuto.");
    }
    return data;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const tick = async () => {
      const data = await recarregar();
      if (cancelled || !data) return;
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

export function useAdminFilasOnChange(
  onChange: () => void,
  intervalMs = DEFAULT_INTERVAL_MS,
  enabled = true,
) {
  const sigRef = useRef<string>("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const poll = async () => {
      const data = await fetchFilasDeduped();
      if (cancelled || !data) return;

      const sig = filasSignature(data);
      if (sigRef.current && sigRef.current !== sig) {
        onChangeRef.current();
      }
      sigRef.current = sig;
    };

    void poll();
    const id = setInterval(() => void poll(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, intervalMs]);
}
