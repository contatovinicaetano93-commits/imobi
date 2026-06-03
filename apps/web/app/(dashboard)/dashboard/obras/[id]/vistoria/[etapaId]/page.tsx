import VistoriaClient from "./VistoriaClient";

export const dynamic = 'force-dynamic';

export default function VistoriaPage({
  params,
}: {
  params: { id: string; etapaId: string };
}) {
  return <VistoriaClient obraId={params.id} etapaId={params.etapaId} />;
}
