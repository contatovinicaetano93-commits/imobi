export default function ConstrutorLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "1.5rem", maxWidth: 720, animation: "sk-pulse 1.4s ease-in-out infinite" }}>
      <style>{`@keyframes sk-pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      {/* Hero card */}
      <div style={{ height: 180, borderRadius: 20, background: "rgba(12,26,61,0.12)" }} />
      {/* Alert strip */}
      <div style={{ height: 44, borderRadius: 12, background: "rgba(12,26,61,0.06)" }} />
      {/* 3 section cards */}
      {[140, 160, 120].map((h, i) => (
        <div key={i} style={{ borderRadius: 16, background: "white", border: "1px solid rgba(12,26,61,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.05)", display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(12,26,61,0.08)" }} />
            <div style={{ height: 12, width: 100, borderRadius: 4, background: "rgba(12,26,61,0.08)" }} />
          </div>
          <div style={{ height: h, background: "rgba(12,26,61,0.03)" }} />
        </div>
      ))}
    </div>
  );
}
