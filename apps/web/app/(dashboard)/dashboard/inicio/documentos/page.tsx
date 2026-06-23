"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TomadorStepShell } from "@/components/dashboard/TomadorStepShell";
import { KycDocumentosContent } from "@/components/dashboard/kyc/KycDocumentosContent";

function DocumentosContent() {
  const searchParams = useSearchParams();
  const bemVindo = searchParams?.get("bem-vindo") === "1";

  return (
    <TomadorStepShell
      step={1}
      title="Verificar identidade"
      subtitle="Envie os documentos para desbloquear obra e crédito."
    >
      <KycDocumentosContent bemVindo={bemVindo} />
    </TomadorStepShell>
  );
}

export default function InicioDocumentosPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
          <p className="text-sm text-gray-400">Carregando...</p>
        </div>
      }
    >
      <DocumentosContent />
    </Suspense>
  );
}
