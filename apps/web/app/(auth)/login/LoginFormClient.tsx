"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { LoginSchema, type LoginInput } from "@imbobi/schemas";
import PasswordInput from "../_components/PasswordInput";
import { redirectAfterLogin } from "@/lib/post-login-redirect";
import { wakeStagingApi } from "@/lib/wake-staging-api";
import { loginWithRetry } from "@/lib/login-with-retry";

type Props = {
  next?: string | null;
};

export default function LoginFormClient({ next }: Props) {
  const [erro, setErro] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  useEffect(() => {
    void wakeStagingApi(2);
  }, []);

  const onSubmit = async (data: LoginInput) => {
    setErro(null);
    setStatusMsg("Conectando ao servidor… (a 1ª vez pode levar até 1 minuto)");
    try {
      const result = await loginWithRetry(data, setStatusMsg);
      await redirectAfterLogin(result.role ?? "", next);
    } catch (e) {
      setStatusMsg(null);
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="login-email" style={labelStyle}>E-mail</label>
        <input
          id="login-email"
          {...register("email")}
          type="email"
          autoComplete="email"
          placeholder="seu@email.com.br"
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          style={errors.email ? inputErrorStyle : inputStyle}
        />
        {errors.email && <p id="login-email-error" role="alert" style={fieldErrorStyle}>{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="login-senha" style={labelStyle}>Senha</label>
        <PasswordInput
          id="login-senha"
          {...register("senha")}
          autoComplete="current-password"
          placeholder="••••••••"
          hasError={!!errors.senha}
          aria-invalid={errors.senha ? "true" : "false"}
          aria-describedby={errors.senha ? "login-senha-error" : undefined}
          style={inputStyle}
          errorStyle={inputErrorStyle}
        />
        {errors.senha && <p id="login-senha-error" role="alert" style={fieldErrorStyle}>{errors.senha.message}</p>}
      </div>

      <div style={{ textAlign: "right" }}>
        <a href="/esqueceu-senha" style={linkStyle}>Esqueci minha senha</a>
      </div>

      {statusMsg && (
        <p style={{ color: "#1B4FD8", fontSize: "0.78rem", background: "#EFF6FF", borderRadius: 8, padding: "0.6rem 0.85rem" }}>
          {statusMsg}
        </p>
      )}

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
        href={`https://wa.me/5511993455589?text=Olá!%20Preciso%20de%20ajuda%20para%20acessar%20minha%20conta%20IMOBI.`}
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

function WaIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

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
