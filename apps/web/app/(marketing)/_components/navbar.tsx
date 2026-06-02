"use client";

import Link from "next/link";

export function MarketingNavbar() {
  return (
    <nav className="fixed top-0 w-full bg-slate-950/80 backdrop-blur border-b border-slate-800 z-50" data-testid="marketing-navbar">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-white" data-testid="navbar-logo">
          IMOBI
        </Link>

        <div className="flex items-center gap-8" data-testid="navbar-links">
          <Link
            href="/quem-somos"
            className="text-slate-300 hover:text-green-400 transition"
            data-testid="navbar-link-about"
          >
            Quem Somos
          </Link>
          <Link
            href="/produtos"
            className="text-slate-300 hover:text-green-400 transition"
            data-testid="navbar-link-products"
          >
            Produtos
          </Link>
          <Link
            href="/como-funciona"
            className="text-slate-300 hover:text-green-400 transition"
            data-testid="navbar-link-how-it-works"
          >
            Como Funciona
          </Link>
          <Link
            href="/contato"
            className="text-slate-300 hover:text-green-400 transition"
            data-testid="navbar-link-contact"
          >
            Contato
          </Link>

          <div className="flex gap-3" data-testid="navbar-auth-buttons">
            <Link
              href="/login"
              className="px-4 py-2 text-green-400 border border-green-400 rounded-lg hover:bg-green-400 hover:text-slate-950 transition"
              data-testid="navbar-login-button"
            >
              Login
            </Link>
            <Link
              href="/simulador"
              className="px-4 py-2 bg-green-400 text-slate-950 rounded-lg font-bold hover:bg-green-500 transition"
              data-testid="navbar-simulate-button"
            >
              Simule
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
