"use client";

import { useRouter } from "next/navigation";
import type { Visita } from "@/lib/api";
import { VisitQueue } from "./VisitQueue";

interface DynamicVisitQueueClientProps {
  visits: Visita[];
}

export function DynamicVisitQueueClient({ visits }: DynamicVisitQueueClientProps) {
  const router = useRouter();

  return (
    <VisitQueue
      visits={visits}
      onSelectVisit={(visitaId) => {
        router.push(`/dashboard/engenheiro/${visitaId}`);
      }}
    />
  );
}
