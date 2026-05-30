import type { ReactNode } from "react";
import { MarketingNavbar } from "./_components/navbar";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MarketingNavbar />
      <main className="pt-16">{children}</main>
    </>
  );
}
