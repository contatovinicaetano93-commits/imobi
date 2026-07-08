import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { IMOBI } from "@/lib/imobi-tokens";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** BRL tabular — padrão SOMA, cores Imobi. */
export function Money({
  value,
  sign = false,
  className,
  size = "md",
}: {
  value: number;
  sign?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-[2.15rem] leading-none",
  } as const;
  const color = sign
    ? value > 0
      ? "text-imobi-gain"
      : value < 0
        ? "text-imobi-loss"
        : "text-imobi-ink"
    : "";
  const prefix = sign && value > 0 ? "+ " : "";
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
  return (
    <span
      className={cx(
        "font-num font-bold tabular-nums tracking-tight",
        sizes[size],
        color,
        className,
      )}
    >
      {prefix}
      {formatted}
    </span>
  );
}

/** Card — fundo claro Imobi (conteúdo), borda suave, cantos arredondados SOMA. */
export function ImobiCard({
  children,
  className,
  highlight = false,
}: {
  children: ReactNode;
  className?: string;
  /** Destaque sutil (hero / próximo passo). */
  highlight?: boolean;
}) {
  return (
    <section
      className={cx(
        "rounded-3xl border border-imobi-border bg-imobi-surface p-5 shadow-sm",
        highlight && "border-imobi-royal/25 bg-gradient-to-br from-imobi-canvas to-white",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function ImobiCardTitle({
  icon: Icon,
  children,
  action,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="text-imobi-royal" size={18} />}
        <h3 className="font-sans text-[1.05rem] font-bold text-imobi-ink">{children}</h3>
      </div>
      {action}
    </div>
  );
}

type BadgeTone = "gain" | "loss" | "warn" | "royal" | "neutral";

export function ImobiBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  const tones: Record<BadgeTone, string> = {
    gain: "bg-emerald-50 text-imobi-gain",
    loss: "bg-red-50 text-imobi-loss",
    warn: "bg-amber-50 text-imobi-warn",
    royal: "bg-blue-50 text-imobi-royal",
    neutral: "bg-gray-100 text-imobi-muted",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-sans text-xs font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function ImobiEyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="font-display text-xs font-bold uppercase tracking-[0.18em] text-imobi-royal"
      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
    >
      {children}
    </p>
  );
}

export function ImobiStatRow({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "ok" | "warn" | "neutral";
}) {
  const ring =
    tone === "ok"
      ? "bg-emerald-50 text-imobi-gain"
      : tone === "warn"
        ? "bg-amber-50 text-imobi-warn"
        : "bg-gray-100 text-imobi-muted";
  return (
    <div className="flex items-center gap-3.5 py-3">
      <span
        className={cx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          ring,
        )}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="font-sans text-xs text-imobi-muted">{label}</p>
        <p className="font-sans text-[0.95rem] font-semibold text-imobi-ink">{value}</p>
      </div>
    </div>
  );
}

export function ImobiPrimaryButton({
  children,
  icon: Icon,
  full = false,
  href,
  onClick,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  full?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const cls = cx(
    "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5",
    "font-sans text-[0.95rem] font-bold text-white transition active:scale-[0.98]",
    "bg-imobi-royal hover:bg-imobi-navy shadow-md shadow-imobi-royal/20",
    full && "w-full",
  );
  if (href) {
    return (
      <a href={href} className={cls}>
        {Icon && <Icon size={18} strokeWidth={2.4} />}
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {Icon && <Icon size={18} strokeWidth={2.4} />}
      {children}
    </button>
  );
}

export function ImobiProgressBar({ pct }: { pct: number }) {
  const width = Math.min(100, Math.max(0, pct));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className="h-full rounded-full bg-imobi-mint transition-all duration-500"
        style={{ width: `${width}%`, backgroundColor: IMOBI.mint }}
      />
    </div>
  );
}

export function ImobiSkeleton({ className }: { className?: string }) {
  return (
    <div className={cx("animate-pulse rounded-xl bg-gray-100", className)} aria-hidden />
  );
}
