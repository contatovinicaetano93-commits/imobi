export const dynamic = "force-dynamic";

import type { CSSProperties } from "react";
import LoginFormClient from "./LoginFormClient";

const WA = "5511993455589";

type PageProps = {
  searchParams?: { next?: string | string[] };
};

export default function LoginPage({ searchParams }: PageProps) {
  const rawNext = searchParams?.next;
  const next = typeof rawNext === "string" ? rawNext : null;

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <LogoHeader subtitle="Acesse sua conta" />
        <LoginFormClient next={next} />
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
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <span key={i} style={{
          background: [1, 3, 5, 7].includes(i) ? "transparent" : "var(--blue)",
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

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1.5rem",
  background: "linear-gradient(150deg, #F0F5FF 0%, #FFFFFF 55%, #F0FDF7 100%)",
};

const cardStyle: CSSProperties = {
  background: "white",
  borderRadius: 20,
  width: "100%",
  maxWidth: 400,
  padding: "2.25rem",
  boxShadow: "0 24px 60px rgba(15,23,42,0.1)",
  border: "1px solid var(--border)",
};
