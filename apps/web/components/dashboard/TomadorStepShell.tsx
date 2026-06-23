import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Route } from "next";
import { TOMADOR_HOME } from "@/lib/tomador-flow";

type TomadorStepShellProps = {
  title: string;
  subtitle?: string;
  step?: number;
  totalSteps?: number;
  backHref?: Route;
  children: React.ReactNode;
};

export function TomadorStepShell({
  title,
  subtitle,
  step,
  totalSteps = 4,
  backHref = TOMADOR_HOME,
  children,
}: TomadorStepShellProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <div className="flex items-start gap-3">
        <Link
          href={backHref}
          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50"
          aria-label="Voltar ao início"
        >
          <ChevronLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div className="min-w-0 flex-1">
          {step != null && (
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1B4FD8]">
              Passo {step} de {totalSteps}
            </p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
