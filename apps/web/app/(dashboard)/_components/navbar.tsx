"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export function DashboardNavbar() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <nav className="fixed top-0 w-full bg-slate-950/80 backdrop-blur border-b border-slate-800 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-xl text-white hover:text-green-400 transition">
          IMOBI
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/dashboard/credito" className="text-slate-300 hover:text-green-400 transition text-sm font-medium">
            Meu Crédito
          </Link>
          <Link href="/dashboard/obras" className="text-slate-300 hover:text-green-400 transition text-sm font-medium">
            Minhas Obras
          </Link>
          <Link href="/dashboard/documentos" className="text-slate-300 hover:text-green-400 transition text-sm font-medium">
            Documentos
          </Link>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition text-slate-300 hover:text-green-400"
          >
            <div className="w-8 h-8 rounded-full bg-green-400/20 flex items-center justify-center text-green-400 text-xs font-bold">
              U
            </div>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-lg py-1">
              <Link
                href="/dashboard/perfil"
                className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-green-400 transition"
              >
                Meu Perfil
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-800 hover:text-red-300 transition"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
