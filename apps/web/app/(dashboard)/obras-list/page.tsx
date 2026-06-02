"use client";

import { useEffect, useState } from "react";
import type { ObraResponse } from "@imbobi/schemas";

export default function ObrasListPage() {
  const [obras, setObras] = useState<ObraResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/obras")
      .then((r) => r.json())
      .then((d) => setObras(d.obras))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-white">Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-white mb-8">Minhas Obras</h1>

      <div className="space-y-4">
        {obras.map((obra) => (
          <div key={obra.id} className="bg-slate-900 rounded-lg border border-slate-800 p-6 hover:border-[#30D158] transition">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{obra.nome}</h3>
                <p className="text-slate-400 text-sm">{obra.local}</p>
              </div>
              <span className="px-3 py-1 bg-[#30D158]/20 text-[#30D158] rounded-full text-sm font-bold">
                {obra.status}
              </span>
            </div>

            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <p className="text-slate-400 text-sm">Progresso</p>
                <p className="text-[#30D158] font-bold">{obra.progresso}%</p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-[#30D158] h-2 rounded-full"
                  style={{ width: `${obra.progresso}%` }}
                ></div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="text-[#30D158] hover:text-[#26c443] text-sm font-bold">
                Ver Detalhes
              </button>
              <button className="text-[#0052CC] hover:text-blue-400 text-sm font-bold">
                Enviar Fotos
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
