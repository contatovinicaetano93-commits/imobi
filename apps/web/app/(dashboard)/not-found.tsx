"use client";

import Link from "next/link";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-200 rounded-full blur-2xl opacity-50" />
            <div className="relative bg-white rounded-full p-6 shadow-lg">
              <AlertTriangle className="w-16 h-16 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">404</h1>
          <h2 className="text-2xl font-bold text-gray-800">Página não encontrada</h2>
          <p className="text-gray-600 leading-relaxed">
            Desculpe, a página que você está procurando não existe ou foi movida. Verifique a URL e tente novamente.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir para Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>

        {/* Help */}
        <div className="pt-8 border-t border-white/50">
          <p className="text-sm text-gray-600 mb-3">Precisa de ajuda?</p>
          <a
            href="mailto:suporte@imobi.com.br"
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
          >
            Entre em contato com suporte →
          </a>
        </div>
      </div>
    </div>
  );
}
