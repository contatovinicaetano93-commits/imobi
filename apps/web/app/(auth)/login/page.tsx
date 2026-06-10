"use client";

export const dynamic = "force-dynamic";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useState, Suspense } from "react";
import { LoginSchema, type LoginInput } from "@imbobi/schemas";

const WA = "5511993455589";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

      // Se há um `next` explícito na URL, honrá-lo (apenas caminhos internos)
      const nextParam = searchParams.get("next");
      if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
        router.push(nextParam as Route);
        return;
      }

      // Redireciona por role
      const me = await fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).catch(() => null);
      const role: string = me?.role ?? "";
      const ROLE_HOME: Record<string, Route> = {
        ADMIN:      "/dashboard/admin",
        GESTOR:     "/dashboard/gestor",
        ENGENHEIRO: "/dashboard/engenheiro",
        COMERCIAL:  "/dashboard/comercial",
        CONSTRUTOR: "/dashboard/construtor",
      };
      router.push(ROLE_HOME[role] ?? "/dashboard");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label style={labelStyle}>E-mail</label>
        <input
          {...register("email")}
          type="email"
          autoComplete="email"
          placeholder="seu@email.com.br"
          style={errors.email ? inputErrorStyle : inputStyle}
        />
        {errors.email && <p style={fieldErrorStyle}>{errors.email.message}</p>}
      </div>

      <div>
        <label style={labelStyle}>Senha</label>
        <input
          {...register("senha")}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          style={errors.senha ? inputErrorStyle : inputStyle}
        />
        {errors.senha && <p style={fieldErrorStyle}>{errors.senha.message}</p>}
      </div>

      <div style={{ textAlign: "right" }}>
        <a href="/esqueceu-senha" style={linkStyle}>Esqueci minha senha</a>
      </div>

      {erro && (
        <p style={{ color: "#EF4444", fontSize: "0.78rem", background: "#FEF2F2", borderRadius: 8, padding: "0.6rem 0.85rem" }}>
          {erro}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} style={submitStyle}>
        {isSubmitting ? "Entrando..." : "Login na plataforma"}
      </button>

      <div style={{ textAlign: "center", position: "relative", margin: "0.5rem 0" }}>
        <span style={{ fontSize: "0.72rem", color: "var(--gray-light)", background: "white", padding: "0 0.75rem", position: "relative", zIndex: 1 }}>ou</span>
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--border)" }} />
      </div>

      <a
        href={`https://wa.me/${WA}?text=Olá!%20Preciso%20de%20ajuda%20para%20acessar%20minha%20conta%20IMOBI.`}
        target="_blank"
        rel="noopener noreferrer"
        style={waButtonStyle}
      >
        <WaIcon size={16} />
        Falar com a equipe IMOBI
      </a>

      <p style={{ fontSize: "0.68rem", color: "var(--gray-light)", textAlign: "center", marginTop: "0.5rem" }}>
        Acesso protegido com criptografia.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <LogoHeader subtitle="Acesse sua conta" />

        <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: "var(--gray)" }}>Carregando...</div>}>
          <LoginForm />
        </Suspense>

        <p style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--gray)", marginTop: "1.25rem" }}>
          Não tem conta?{" "}
          <a href="/cadastro" style={{ color: "var(--blue)", fontWeight: 600, textDecoration: "none" }}>
            Criar conta
          </a>
        </p>
      </div>

      <WaFloat />
    </div>
  );
}

function LogoHeader({ subtitle }: { subtitle: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.75rem" }}>
      <LogoIcon />
      <div>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>IMOBI</div>
        <div style={{ fontSize: "0.72rem", color: "var(--gray)", marginTop: 1 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function LogoIcon({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, border: "2px solid var(--blue)",
      borderRadius: 6, display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gridTemplateRows: "1fr 1fr 1fr",
      gap: 2, padding: 4, flexShrink: 0,
    }}>
      {[0,1,2,3,4,5,6,7,8].map((i) => (
        <span key={i} style={{
          background: [1,3,5,7].includes(i) ? "transparent" : "var(--blue)",
          borderRadius: 1, display: "block",
        }} />
      ))}
    </div>
  );
}

function WaIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function WaFloat() {
  return (
    <a
      href={`https://wa.me/${WA}?text=Olá!%20Preciso%20de%20ajuda%20com%20o%20IMOBI.`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco no WhatsApp"
      style={{
        position: "fixed", bottom: "1.75rem", right: "1.75rem",
        width: 48, height: 48, borderRadius: "50%",
        backgroundColor: "#25D366", display: "flex",
        alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 16px rgba(37,211,102,0.35)",
        color: "white", textDecoration: "none", zIndex: 50,
      }}
    >
      <WaIcon size={24} />
    </a>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1.5rem",
  background: "linear-gradient(150deg, #F0F5FF 0%, #FFFFFF 55%, #F0FDF7 100%)",
};

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  width: "100%",
  maxWidth: 400,
  padding: "2.25rem",
  boxShadow: "0 24px 60px rgba(15,23,42,0.1)",
  border: "1px solid var(--border)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  fontWeight: 600,
  color: "var(--ink-soft)",
  marginBottom: "0.4rem",
};

const baseInputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--ink)",
  fontFamily: "Inter, sans-serif",
  fontSize: "0.88rem",
  padding: "0.72rem 1rem",
  borderRadius: 10,
  outline: "none",
  transition: "all 0.15s",
};

const inputStyle: React.CSSProperties = { ...baseInputStyle };
const inputErrorStyle: React.CSSProperties = { ...baseInputStyle, borderColor: "#FCA5A5", background: "#FEF2F2" };

const fieldErrorStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "#EF4444",
  marginTop: "0.25rem",
};

const linkStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--blue)",
  textDecoration: "none",
  fontWeight: 500,
};

const submitStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--blue)",
  color: "white",
  fontFamily: "Inter, sans-serif",
  fontSize: "0.88rem",
  fontWeight: 600,
  padding: "0.85rem",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  transition: "all 0.15s",
  boxShadow: "0 4px 14px rgba(27,79,216,0.28)",
};

const waButtonStyle: React.CSSProperties = {
  width: "100%",
  background: "white",
  color: "#128C7E",
  border: "1px solid #D1FAE5",
  fontFamily: "Inter, sans-serif",
  fontSize: "0.82rem",
  fontWeight: 600,
  padding: "0.75rem",
  borderRadius: 10,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
  textDecoration: "none",
  transition: "background 0.15s",
};
