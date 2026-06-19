"use client";

import { useState } from "react";
import Link from "next/link";

const WA = "5511993455589";

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <LogoHeader />

        <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.35rem" }}>
          Esqueceu a senha?
        </h1>
        <p style={{ fontSize: "0.83rem", color: "var(--gray)", marginBottom: "1.75rem", lineHeight: 1.6 }}>
          Informe seu e-mail e enviaremos um link de redefinição.
        </p>

        {sent ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--mint-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "0.35rem" }}>E-mail enviado!</p>
            <p style={{ fontSize: "0.83rem", color: "var(--gray)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              Verifique sua caixa de entrada e siga as instruções.
            </p>
            <Link href="/login" style={{ fontSize: "0.83rem", color: "var(--blue)", fontWeight: 500, textDecoration: "none" }}>
              ← Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate aria-label="Formulário de recuperação de senha" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label htmlFor="esq-email" style={labelStyle}>E-mail</label>
              <input
                id="esq-email"
                type="email"
                required
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby={error ? "esq-email-err" : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com.br"
                style={inputStyle}
              />
            </div>

            {error && (
              <p id="esq-email-err" role="alert" aria-live="assertive" style={{ color: "#EF4444", fontSize: "0.78rem", background: "#FEF2F2", borderRadius: 8, padding: "0.6rem 0.85rem" }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} aria-busy={loading} style={submitStyle}>
              {loading ? "Enviando..." : "Enviar link de redefinição"}
            </button>

            <div style={{ textAlign: "center" }}>
              <Link href="/login" style={{ fontSize: "0.83rem", color: "var(--blue)", fontWeight: 500, textDecoration: "none" }}>
                ← Voltar ao login
              </Link>
            </div>
          </form>
        )}
      </div>

      <a
        href={`https://wa.me/${WA}?text=Olá!%20Preciso%20de%20ajuda%20com%20o%20IMOBI.`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco no WhatsApp"
        style={{ position: "fixed", bottom: "1.75rem", right: "1.75rem", width: 48, height: 48, borderRadius: "50%", backgroundColor: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(37,211,102,0.35)", color: "white", textDecoration: "none", zIndex: 50 }}
      >
        <svg width={24} height={24} viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}

function LogoHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
      <div style={{ width: 28, height: 28, border: "2px solid var(--blue)", borderRadius: 6, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr 1fr", gap: 2, padding: 4, flexShrink: 0 }}>
        {[0,1,2,3,4,5,6,7,8].map((i) => (
          <span key={i} style={{ background: [1,3,5,7].includes(i) ? "transparent" : "var(--blue)", borderRadius: 1, display: "block" }} />
        ))}
      </div>
      <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>IMOBI</span>
    </div>
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

const inputStyle: React.CSSProperties = {
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
