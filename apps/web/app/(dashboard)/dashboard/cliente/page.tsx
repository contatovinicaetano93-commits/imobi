"use client";

import { useEffect, useState } from "react";
import { useJornada } from "@/hooks/jornada-context";
import { NextStepHero } from "@/components/dashboard/NextStepHero";
import { JornadaError } from "@/components/dashboard/JornadaError";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";

export default function ClienteHomePage() {
  const { jornada, loading, error, refresh } = useJornada();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || loading) return <PageSkeleton />;

  if (error || !jornada) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <JornadaError message={error ?? undefined} onRetry={() => void refresh()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <NextStepHero jornada={jornada} variant="cliente" />
    </div>
  );
}
