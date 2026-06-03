import type { Metadata } from "next";
import ObraDetailClient from "./ObraDetailClient";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: "Detalhe da Obra — imbobi" };

export default function ObraDetailPage({ params }: { params: { id: string } }) {
  return <ObraDetailClient id={params.id} />;
}
