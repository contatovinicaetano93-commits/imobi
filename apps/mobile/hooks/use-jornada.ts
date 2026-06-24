import { useCallback, useEffect, useState } from "react";
import { obterJornada, type Jornada } from "../lib/jornada";

export function useJornada() {
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJornada(await obterJornada());
    } catch (e) {
      setJornada(null);
      setError(e instanceof Error ? e.message : "Erro ao carregar jornada");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { jornada, loading, error, refresh: load };
}
