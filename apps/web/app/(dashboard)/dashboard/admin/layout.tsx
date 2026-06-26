import { AdminFilasBar } from "@/components/admin/AdminFilasBar";
import { AdminSearchBar } from "@/components/admin/AdminSearchBar";

export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-0">
      <AdminSearchBar />
      <AdminFilasBar />
      {children}
    </div>
  );
}
