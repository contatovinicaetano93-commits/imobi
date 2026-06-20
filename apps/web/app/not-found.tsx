import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        fontFamily: "'Jost', system-ui, sans-serif",
        background: "#f8fafc",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <p style={{ fontSize: "5rem", fontWeight: 800, color: "#e5e7eb", margin: "0 0 8px", lineHeight: 1 }}>
        404
      </p>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0C1A3D", margin: "0 0 10px" }}>
        Página não encontrada
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#6b7280", maxWidth: 320, margin: "0 0 32px" }}>
        O endereço que você acessou não existe ou foi movido.
      </p>
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "0.55rem 1.5rem",
          borderRadius: 10,
          background: "#1B4FD8",
          color: "white",
          fontWeight: 600,
          fontSize: "0.875rem",
          textDecoration: "none",
        }}
      >
        Voltar para a página inicial
      </Link>
    </div>
  );
}
