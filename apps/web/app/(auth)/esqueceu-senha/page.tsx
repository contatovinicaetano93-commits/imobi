"use client";

import { useState } from "react";
import Link from "next/link";

export default function EsqueceuSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/auth/esqueceu-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Erro ao enviar e-mail.");
      }
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #1B4FD8 0%, #1e40af 100%)" }}
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full" style={{ backgroundColor: "#16a34a" }} />
          <div className="p-8">
            <div className="mb-6 text-center">
              <span className="text-2xl font-bold" style={{ color: "#1B4FD8" }}>imbobi</span>
              <h1 className="text-xl font-semibold text-gray-900 mt-2">Esqueceu a senha?</h1>
              <p className="text-sm text-gray-500 mt-1">
                Informe seu e-mail e enviaremos um link de redefinição.
              </p>
            </div>

            {sent ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium">E-mail enviado!</p>
                <p className="text-sm text-gray-500 mt-1">
                  Verifique sua caixa de entrada e siga as instruções.
                </p>
                <Link href="/login" className="mt-6 inline-block text-sm font-medium" style={{ color: "#1B4FD8" }}>
                  ← Voltar ao login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ focusRingColor: "#1B4FD8" } as any}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white font-bold py-3 rounded-xl text-sm transition disabled:opacity-60"
                  style={{ backgroundColor: "#16a34a" }}
                >
                  {loading ? "Enviando..." : "Enviar link de redefinição"}
                </button>

                <div className="text-center">
                  <Link href="/login" className="text-sm font-medium" style={{ color: "#1B4FD8" }}>
                    ← Voltar ao login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
