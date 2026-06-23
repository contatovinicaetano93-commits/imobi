"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "Inter, sans-serif" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0C1A3D" }}>Erro inesperado</h1>
          <p style={{ color: "rgba(12,26,61,0.55)", margin: "12px 0 24px", maxWidth: 360 }}>
            {error.message || "Algo deu errado. Tente novamente."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: 10,
              border: "none",
              background: "#0C1A3D",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
