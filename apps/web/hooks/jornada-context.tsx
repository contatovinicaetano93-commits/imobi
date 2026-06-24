"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Jornada } from "@/lib/api";
import { obterJornadaResiliente, mensagemErroJornada } from "@/lib/jornada-fetch";

type JornadaContextValue = {
  jornada: Jornada | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const JornadaContext = createContext<JornadaContextValue | null>(null);

const JORNADA_CACHE_MS = 30_000;

/** Uma requisição em voo por aba — evita 429 por chamadas duplicadas. */
let inflight: Promise<Jornada> | null = null;
let cachedJornada: Jornada | null = null;
let cachedAt = 0;

function fetchJornadaDeduped(force = false): Promise<Jornada> {
  const now = Date.now();
  if (!force && cachedJornada && now - cachedAt < JORNADA_CACHE_MS) {
    return Promise.resolve(cachedJornada);
  }
  if (!inflight) {
    inflight = obterJornadaResiliente()
      .then((data) => {
        cachedJornada = data;
        cachedAt = Date.now();
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

type ProviderProps = {
  enabled: boolean;
  children: ReactNode;
};

export function JornadaProvider({ enabled, children }: ProviderProps) {
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJornadaDeduped(force);
      setJornada(data);
    } catch (err) {
      setJornada(null);
      setError(mensagemErroJornada(err));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setJornada(null);
      setError(null);
      setLoading(false);
      return;
    }
    void load();
  }, [enabled, load]);

  const value = useMemo(
    () => ({ jornada, loading, error, refresh: () => load(true) }),
    [jornada, loading, error, load],
  );

  return (
    <JornadaContext.Provider value={value}>{children}</JornadaContext.Provider>
  );
}

export function useJornada(): JornadaContextValue {
  const ctx = useContext(JornadaContext);
  if (!ctx) {
    throw new Error("useJornada must be used within JornadaProvider");
  }
  return ctx;
}

export function useJornadaOptional(): JornadaContextValue | null {
  return useContext(JornadaContext);
}
