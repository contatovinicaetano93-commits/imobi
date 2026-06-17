export default function GestorLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "1.5rem", maxWidth: 900, animation: "sk-pulse 1.4s ease-in-out infinite" }}>
      <style>{`@keyframes sk-pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <div style={{ height: 120, borderRadius: 20, background: "rgba(12,26,61,0.1)" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: 14, background: "rgba(12,26,61,0.07)" }} />)}
      </div>
      {[200, 160].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 16, background: "white", border: "1px solid rgba(12,26,61,0.06)" }} />
      ))}
    </div>
  );
}
