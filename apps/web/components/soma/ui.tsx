import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/* ── helpers ─────────────────────────────────────────────────────────── */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Formata BRL com números tabulares; colore por sinal quando pedido. */
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
      ? "text-soma-gain"
      : value < 0
        ? "text-soma-loss"
        : "text-soma-text"
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

/* ── card ────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className,
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <section
      className={cx(
        "rounded-3xl border border-soma-line/70 bg-soma-surface p-5 shadow-soma-card",
        glow && "shadow-gold-glow",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardTitle({
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
        {Icon && <Icon className="text-soma-gold" size={18} />}
        <h3 className="font-sans text-[1.05rem] font-bold text-soma-text">
          {children}
        </h3>
      </div>
      {action}
    </div>
  );
}

/* ── badge (status pill) ─────────────────────────────────────────────── */

type BadgeTone = "gain" | "loss" | "warn" | "neutral" | "gold";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  const tones: Record<BadgeTone, string> = {
    gain: "bg-soma-gain/15 text-soma-gain",
    loss: "bg-soma-loss/15 text-soma-loss",
    warn: "bg-soma-warn/15 text-soma-warn",
    gold: "bg-soma-gold/15 text-soma-gold",
    neutral: "bg-white/8 text-soma-muted",
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

/* ── eyebrow / section label ─────────────────────────────────────────── */

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-soma-gold">
      {children}
    </p>
  );
}

/* ── stat row (ícone circular + label + valor) ───────────────────────── */

export function StatRow({
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
      ? "bg-soma-gain/12 text-soma-gain"
      : tone === "warn"
        ? "bg-soma-warn/12 text-soma-warn"
        : "bg-white/6 text-soma-muted";
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
        <p className="font-sans text-xs text-soma-muted">{label}</p>
        <p className="font-sans text-[0.95rem] font-semibold text-soma-text">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ── button ──────────────────────────────────────────────────────────── */

export function GoldButton({
  children,
  icon: Icon,
  full = false,
  onClick,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  full?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-grad px-5 py-3.5",
        "font-sans text-[0.95rem] font-bold text-black transition active:scale-[0.98]",
        "shadow-gold-glow",
        full && "w-full",
      )}
    >
      {Icon && <Icon size={18} strokeWidth={2.4} />}
      {children}
    </button>
  );
}

/* ── skeleton ────────────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx("animate-pulse rounded-xl bg-white/5", className)}
      aria-hidden
    />
  );
}
