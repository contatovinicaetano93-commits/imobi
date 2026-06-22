import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";

type Props = {
  mensagem: string;
  href: string;
  label: string;
  variant?: "warning" | "info";
};

export function FlowGateBanner({ mensagem, href, label, variant = "warning" }: Props) {
  const bg = variant === "warning" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200";
  const text = variant === "warning" ? "text-amber-900" : "text-blue-900";
  const btn = variant === "warning" ? "bg-amber-600 hover:bg-amber-700" : "bg-[#1B4FD8] hover:opacity-90";

  return (
    <div className={`${bg} border rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3`}>
      <div className="flex items-start gap-3 flex-1">
        <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${variant === "warning" ? "text-amber-600" : "text-blue-600"}`} />
        <p className={`text-sm ${text}`}>{mensagem}</p>
      </div>
      <Link
        href={href as never}
        className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0 ${btn}`}
      >
        {label}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
