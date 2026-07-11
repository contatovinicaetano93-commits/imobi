"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { obrasCanonicoApi } from "@/lib/api";

export default function NovaObraClientePage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [valorCredito, setValorCredito] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const valor = Number(valorCredito.replace(/\D/g, "")) / 100 || Number(valorCredito);
      if (!nome.trim() || !endereco.trim() || !valor || valor <= 0) {
        throw new Error("Preencha nome, endereço e valor de crédito válidos.");
      }
      await obrasCanonicoApi.criar({ nome: nome.trim(), endereco: endereco.trim(), valorCredito: valor });
      router.replace("/dashboard/cliente/obra" as Route);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cadastrar obra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <Link href={"/dashboard/cliente/obra" as Route} className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 no-underline">
        <ArrowLeft size={16} /> Voltar
      </Link>
      <h1 className="text-2xl font-bold text-[#0C1A3D]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        Cadastrar obra
      </h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">Informe os dados básicos da obra para análise.</p>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium text-gray-700">
          Nome da obra
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="Residencial Exemplo"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Endereço
          <input
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="Rua, número, bairro, cidade"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Valor do crédito (R$)
          <input
            value={valorCredito}
            onChange={(e) => setValorCredito(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="500000"
            inputMode="numeric"
          />
        </label>
        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#1B4FD8] py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {loading ? "Salvando…" : "Cadastrar obra"}
        </button>
      </form>
    </div>
  );
}
