"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoginSchema, type LoginInput } from "@imbobi/schemas";

const WA = "5511993455589";

export default function LoginPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setErro(null);
    try {
      const res = await fetch("/api/proxy/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? "Credenciais inválidas");
      router.push("/dashboard");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #1B4FD8 0%, #1e40af 100%)" }}
    >
      {/* Card compacto */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
        {/* Faixa verde no topo */}
        <div className="h-1.5 w-full bg-brand-600" />

        <div className="px-6 py-6 space-y-5">
          {/* Logo */}
          <div className="text-center">
            <span className="text-2xl font-bold text-brand-700">imbobi</span>
            <p className="text-gray-400 text-xs mt-0.5">Acesse sua conta</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* E-mail */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
                E-mail
              </label>
              <input
                {...register("email")}
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                className={inputCls(!!errors.email)}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
                Senha
              </label>
              <input
                {...register("senha")}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={inputCls(!!errors.senha)}
              />
              {errors.senha && (
                <p className="text-xs text-red-500">{errors.senha.message}</p>
              )}
            </div>

            {erro && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}

            {/* Botão login */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full text-white font-bold py-3 rounded-xl transition-all text-sm disabled:opacity-60 hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#16a34a" }}
            >
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="flex flex-col items-center gap-1">
            <a
              href="/esqueceu-senha"
              className="text-xs hover:underline"
              style={{ color: "#1B4FD8" }}
            >
              Esqueci minha senha
            </a>
            <p className="text-xs text-gray-400">
              Não tem conta?{" "}
              <a
                href="/cadastro"
                className="font-semibold hover:underline"
                style={{ color: "#16a34a" }}
              >
                Cadastre-se
              </a>
            </p>
          </div>
        </div>

        {/* Faixa verde no rodapé */}
        <div className="h-1 w-full bg-brand-500 opacity-40" />
      </div>

      {/* WhatsApp flutuante */}
      <a
        href={`https://wa.me/${WA}?text=Olá!%20Preciso%20de%20ajuda%20com%20o%20imbobi.`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco no WhatsApp"
        className="fixed bottom-6 right-6 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
        style={{ backgroundColor: "#25D366" }}
      >
        <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}

const inputCls = (hasError: boolean) =>
  `w-full border rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-green-400 transition ${
    hasError ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:bg-white"
  }`;
