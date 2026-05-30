"use client";

import Link from "next/link";

export function MarketingNavbar() {
  return (
    <nav className="fixed top-0 w-full bg-slate-950/80 backdrop-blur border-b border-slate-800 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-white">
          IMOBI
        </Link>

        <div className="flex items-center gap-8">
          <Link
            href="/quem-somos"
            className="text-slate-300 hover:text-green-400 transition"
          >
            Quem Somos
          </Link>
          <Link
            href="/produtos"
            className="text-slate-300 hover:text-green-400 transition"
          >
            Produtos
          </Link>
          <Link
            href="/como-funciona"
            className="text-slate-300 hover:text-green-400 transition"
          >
            Como Funciona
          </Link>
          <Link
            href="/contato"
            className="text-slate-300 hover:text-green-400 transition"
          >
            Contato
          </Link>

          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-green-400 border border-green-400 rounded-lg hover:bg-green-400 hover:text-slate-950 transition"
            >
              Login
            </Link>
            <Link
              href="/simulador"
              className="px-4 py-2 bg-green-400 text-slate-950 rounded-lg font-bold hover:bg-green-500 transition"
            >
              Simule
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
