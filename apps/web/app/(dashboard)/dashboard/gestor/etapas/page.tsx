import { Suspense } from "react";
import EtapasContent from "./EtapasContent";

export default function EtapasPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><div><h1 className="text-2xl font-bold text-gray-900">Etapas Pendentes</h1><p className="text-gray-500 text-sm mt-1">Carregando...</p></div></div>}>
      <EtapasContent />
    </Suspense>
  );
}
