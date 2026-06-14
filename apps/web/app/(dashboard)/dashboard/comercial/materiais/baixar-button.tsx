"use client";

import { Download } from "lucide-react";

export function BaixarButton({ cor }: { cor: string }) {
  return (
    <button
      className="flex items-center justify-center gap-1.5 text-xs font-semibold w-full py-2 rounded-xl border transition hover:opacity-80"
      style={{ borderColor: cor + "40", color: cor, background: cor + "08" }}
      onClick={() => alert("Material disponível em breve. Entre em contato com o suporte para acesso antecipado.")}
    >
      <Download size={12} />
      Baixar
    </button>
  );
}
