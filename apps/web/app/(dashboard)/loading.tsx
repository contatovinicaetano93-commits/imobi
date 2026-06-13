export default function DashboardLoading() {
  return (
    <div style={{ padding: "1.5rem", maxWidth: 900, animation: "pulse 1.4s ease-in-out infinite" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
      {/* Page title skeleton */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ height: 12, width: 60, borderRadius: 6, background: "rgba(12,26,61,0.08)", marginBottom: 10 }} />
        <div style={{ height: 28, width: 220, borderRadius: 8, background: "rgba(12,26,61,0.1)" }} />
      </div>
      {/* Card skeleton rows */}
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          background: "white", borderRadius: 16, border: "1px solid rgba(12,26,61,0.07)",
          padding: "1.25rem", marginBottom: 16,
        }}>
          <div style={{ height: 13, width: 140, borderRadius: 6, background: "rgba(12,26,61,0.08)", marginBottom: 16 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[1, 2, 3].map((j) => (
              <div key={j} style={{ height: 72, borderRadius: 10, background: "rgba(12,26,61,0.05)" }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
