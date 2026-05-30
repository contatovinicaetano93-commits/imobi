"use client";

import Link from "next/link";

export function DashboardNavbar() {
  return (
    <nav className="fixed top-0 w-full bg-slate-950/80 backdrop-blur border-b border-slate-800 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard/credito" className="font-bold text-xl text-white">
          IMOBI
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/dashboard/credito"
            className="text-slate-300 hover:text-green-400 transition"
          >
            Meu Crédito
          </Link>
          <Link
            href="/dashboard/obras"
            className="text-slate-300 hover:text-green-400 transition"
          >
            Minhas Obras
          </Link>
          <Link
            href="/dashboard/documentos"
            className="text-slate-300 hover:text-green-400 transition"
          >
            Documentos
          </Link>

          <button className="px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-lg transition">
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}
