type BadgeVariant =
  | "default"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "primary";

type BadgeSize = "sm" | "md";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-800",
  success: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
  warning: "bg-yellow-100 text-yellow-800",
  info: "bg-blue-100 text-blue-800",
  primary: "bg-brand-100 text-brand-800",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

export function Badge({
  label,
  variant = "default",
  size = "sm",
  icon,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full ${
        variantStyles[variant]
      } ${sizeStyles[size]}`}
    >
      {icon && <span>{icon}</span>}
      {label}
    </span>
  );
}

interface StatusBadgeProps {
  status:
    | "PENDENTE"
    | "APROVADA"
    | "REJEITADA"
    | "ATIVO"
    | "INATIVO"
    | "EM_ANDAMENTO"
    | "CONCLUIDO"
    | "AGENDADA"
    | "INICIADA";
  label?: string;
}

const statusMap: Record<StatusBadgeProps["status"], { variant: BadgeVariant; label: string }> = {
  PENDENTE: { variant: "warning", label: "Pendente" },
  APROVADA: { variant: "success", label: "Aprovada" },
  REJEITADA: { variant: "error", label: "Rejeitada" },
  ATIVO: { variant: "success", label: "Ativo" },
  INATIVO: { variant: "default", label: "Inativo" },
  EM_ANDAMENTO: { variant: "info", label: "Em Andamento" },
  CONCLUIDO: { variant: "success", label: "Concluído" },
  AGENDADA: { variant: "warning", label: "Agendada" },
  INICIADA: { variant: "info", label: "Iniciada" },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusMap[status];
  return (
    <Badge
      label={label || config.label}
      variant={config.variant}
      size="sm"
    />
  );
}
