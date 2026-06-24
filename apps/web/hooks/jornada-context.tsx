"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Jornada } from "@/lib/api";
import { obterJornadaResiliente, mensagemErroJornada } from "@/lib/jornada-fetch";

type JornadaContextValue = {
  jornada: Jornada | null;
  /** Primeira carga — sem dados ainda */
  loading: boolean;
  /** Revalidação em background — mantém hero visível */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const JornadaContext = createContext<JornadaContextValue | null>(null);

const JORNADA_CACHE_MS = 30_000;

type CacheEntry = {
  scope: string;
  jornada: Jornada;
  at: number;
};

let cache: CacheEntry | null = null;
let inflight: { scope: string; promise: Promise<Jornada> } | null = null;

function resetModuleCache() {
  cache = null;
  inflight = null;
}

function fetchJornadaDeduped(scope: string, force = false): Promise<Jornada> {
  if (cache && cache.scope !== scope) {
    resetModuleCache();
  }

  const now = Date.now();
  if (!force && cache?.scope === scope && now - cache.at < JORNADA_CACHE_MS) {
    return Promise.resolve(cache.jornada);
  }

  if (!force && inflight?.scope === scope) {
    return inflight.promise;
  }

  const request = obterJornadaResiliente()
    .then((data) => {
      cache = { scope, jornada: data, at: Date.now() };
      return data;
    })
    .finally(() => {
      if (inflight?.promise === request) {
        inflight = null;
      }
    });

  inflight = { scope, promise: request };
  return request;
}

type ProviderProps = {
  enabled: boolean;
  /** Isola cache por usuário (email ou role) — evita vazamento entre contas na mesma aba */
  scopeKey: string | null;
  children: ReactNode;
};

export function JornadaProvider({ enabled, scopeKey, children }: ProviderProps) {
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const jornadaRef = useRef<Jornada | null>(null);
  jornadaRef.current = jornada;

  const load = useCallback(
    async (force = false) => {
      if (!enabled || !scopeKey) return;

      setError(null);
      const hasCached =
        !force &&
        cache?.scope === scopeKey &&
        Date.now() - cache.at < JORNADA_CACHE_MS;

      if (force && jornadaRef.current) {
        setRefreshing(true);
      } else if (!hasCached && !jornadaRef.current) {
        setLoading(true);
      }

      try {
        const data = await fetchJornadaDeduped(scopeKey, force);
        setJornada(data);
      } catch (err) {
        if (!jornadaRef.current) {
          setJornada(null);
        }
        setError(mensagemErroJornada(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enabled, scopeKey],
  );

  useEffect(() => {
    if (!enabled || !scopeKey) {
      setJornada(null);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (cache?.scope !== scopeKey) {
      setJornada(null);
    }

    void load();
  }, [enabled, scopeKey, load]);

  const value = useMemo(
    () => ({
      jornada,
      loading,
      refreshing,
      error,
      refresh: () => load(true),
    }),
    [jornada, loading, refreshing, error, load],
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
