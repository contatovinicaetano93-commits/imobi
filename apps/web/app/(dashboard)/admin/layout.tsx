import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.tipo !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600 mt-2">Gerenciamento avançado do sistema</p>
        </div>

        <nav className="mb-8 flex gap-4 flex-wrap border-b border-slate-200 pb-4">
          <a
            href="/admin"
            className="px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition"
          >
            Dashboard
          </a>
          <a
            href="/admin/users"
            className="px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition"
          >
            Usuários
          </a>
          <a
            href="/admin/kyc"
            className="px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition"
          >
            KYC Pendente
          </a>
          <a
            href="/admin/credits"
            className="px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition"
          >
            Créditos
          </a>
          <a
            href="/admin/stages"
            className="px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition"
          >
            Etapas
          </a>
          <a
            href="/admin/monitoring"
            className="px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition"
          >
            Monitoramento
          </a>
        </nav>

        {children}
      </div>
    </div>
  );
}
