import { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900">Imbobi Admin</h2>
        </div>
        <nav className="space-y-2 px-4">
          <Link
            href="/admin/dashboard"
            className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700 font-medium"
          >
            📊 Dashboard
          </Link>
          <Link
            href="/admin/manager"
            className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700 font-medium"
          >
            ✅ Aprovações
          </Link>
          <Link
            href="/admin/kyc"
            className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700 font-medium"
          >
            🆔 KYC Review
          </Link>
          <Link
            href="/admin/marketplace"
            className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700 font-medium"
          >
            🤝 Marketplace
          </Link>
          <div className="border-t my-4"></div>
          <Link
            href="/logout"
            className="block px-4 py-2 rounded-lg hover:bg-red-50 text-red-700 font-medium"
          >
            🚪 Logout
          </Link>
        </nav>
      </aside>

      <main className="flex-1">
        <header className="bg-white shadow">
          <div className="px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
