"use client";

import { AdminPagamentosPanel } from "../_components/AdminPagamentosPanel";

export default function AdminPagamentosPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-[#4ADE80]">Admin IMOBI</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0C1A3D] sm:text-3xl">
          Pagamentos SIPOC
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Liberações aprovadas na vistoria, aguardando transferência manual e confirmação.
        </p>
      </header>
      <AdminPagamentosPanel showBackLink />
    </div>
  );
}
