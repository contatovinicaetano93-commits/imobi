"use client";

import { ADMIN_OBRAS_FLOW } from "@/lib/panel-navigation";

const NAVY = "#0C1A3D";
const MINT = "#4ADE80";
const ROYAL = "#1B4FD8";

type Props = {
  activeStep?: number;
};

export function AdminFlowGuide({ activeStep }: Props) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-[#1B4FD8] mb-3">
        Fluxo SIPOC — liberação guiada
      </p>
      <ol className="grid gap-2 sm:grid-cols-5 sm:gap-3">
        {ADMIN_OBRAS_FLOW.map(({ step, label, actor, desc }) => {
          const isActive = activeStep === step;
          return (
            <li
              key={step}
              className={`rounded-xl border p-3 transition-colors ${
                isActive
                  ? "border-[#4ADE80] bg-white shadow-sm"
                  : "border-gray-100 bg-white/60"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: isActive ? MINT : NAVY }}
                >
                  {step}
                </span>
                <span className="text-xs font-bold text-[#0C1A3D]">{label}</span>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: ROYAL }}>
                {actor}
              </p>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">{desc}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
