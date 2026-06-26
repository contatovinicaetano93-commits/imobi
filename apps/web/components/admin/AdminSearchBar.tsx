"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search, Loader2 } from "lucide-react";
import { adminApi, type AdminSearchHit } from "@/lib/api";

const TIPO_LABEL: Record<AdminSearchHit["tipo"], string> = {
  usuario: "Usuário",
  obra: "Obra",
  dossie: "Dossiê",
  documento: "Documento",
};

export function AdminSearchBar() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<AdminSearchHit[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const buscar = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await adminApi.buscar(term, 20);
      setHits(res.resultados);
      setOpen(res.resultados.length > 0);
    } catch {
      setHits([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void buscar(q), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, buscar]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={wrapRef} className="relative mb-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder="Buscar usuário, obra, dossiê ou documento…"
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 shadow-sm focus:border-[#1B4FD8] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20"
          aria-label="Busca admin unificada"
        />
      </div>

      {open && hits.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
          {hits.map((hit) => (
            <li key={`${hit.tipo}-${hit.id}`}>
              <Link
                href={hit.href as Route}
                onClick={() => setOpen(false)}
                className="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-[#EEF3FF]"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-600">
                    {TIPO_LABEL[hit.tipo]}
                  </span>
                  {hit.titulo}
                </span>
                {(hit.subtitulo || hit.status) && (
                  <span className="text-xs text-gray-500">
                    {[hit.subtitulo, hit.status].filter(Boolean).join(" · ")}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {q.trim().length >= 2 && !loading && hits.length === 0 && open && (
        <p className="absolute z-50 mt-1 w-full rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-500 shadow-lg">
          Nenhum resultado para &quot;{q.trim()}&quot;
        </p>
      )}
    </div>
  );
}
