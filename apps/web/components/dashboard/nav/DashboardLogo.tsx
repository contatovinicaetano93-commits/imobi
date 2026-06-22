import { DASHBOARD_MINT } from "./dashboard-nav-config";

export function DashboardLogo({ size = 26 }: { size?: number }) {
  return (
    <div
      className="grid shrink-0 gap-0.5 rounded-md p-1"
      style={{
        width: size,
        height: size,
        border: `1.5px solid ${DASHBOARD_MINT}`,
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateRows: "1fr 1fr 1fr",
      }}
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <span
          key={i}
          className="block rounded-[1px]"
          style={{ background: [1, 3, 5, 7].includes(i) ? "transparent" : DASHBOARD_MINT }}
        />
      ))}
    </div>
  );
}
