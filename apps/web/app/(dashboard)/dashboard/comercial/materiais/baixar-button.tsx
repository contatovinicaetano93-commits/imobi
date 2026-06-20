"use client";

import { Download } from "lucide-react";
import { useToast } from "@/hooks/toast-context";

export function BaixarButton({ cor }: { cor: string }) {
  const { info } = useToast();

  return (
    <button
      className="flex items-center justify-center gap-1.5 text-xs font-semibold w-full py-2 rounded-xl border transition hover:opacity-80"
      style={{ borderColor: cor + "40", color: cor, background: cor + "08" }}
      onClick={() => info("Material disponível em breve. Entre em contato com o suporte para acesso antecipado.")}
    >
      <Download size={12} />
      Baixar
    </button>
  );
}
