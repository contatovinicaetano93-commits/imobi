import Link from "next/link";

export const dynamic = "force-static";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#0C1A3D", marginBottom: 8 }}>404</h1>
      <p style={{ color: "rgba(12,26,61,0.55)", marginBottom: 24 }}>Página não encontrada.</p>
      <Link
        href="/"
        style={{
          padding: "0.6rem 1.2rem",
          borderRadius: 10,
          background: "#0C1A3D",
          color: "white",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Voltar ao início
      </Link>
    </main>
  );
}
