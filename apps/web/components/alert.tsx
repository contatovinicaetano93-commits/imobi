type AlertType = "success" | "error" | "warning" | "info";

interface AlertProps {
  type: AlertType;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const colors: Record<AlertType, { bg: string; border: string; text: string; icon: string }> = {
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    icon: "text-green-600",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    icon: "text-red-600",
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    icon: "text-yellow-600",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    icon: "text-blue-600",
  },
};

const icons: Record<AlertType, string> = {
  success: "✓",
  error: "!",
  warning: "⚠",
  info: "ℹ",
};

export function Alert({
  type,
  title,
  message,
  dismissible = true,
  onDismiss,
}: AlertProps) {
  const style = colors[type];

  return (
    <div className={`${style.bg} border ${style.border} rounded-xl p-4 flex gap-3`}>
      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-sm font-bold ${style.icon} bg-white`}>
        {icons[type]}
      </div>
      <div className="flex-1">
        {title && <h3 className={`font-semibold ${style.text} text-sm`}>{title}</h3>}
        <p className={`text-sm ${style.text}`}>{message}</p>
      </div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 text-lg ${style.text} hover:opacity-75 transition`}
        >
          ×
        </button>
      )}
    </div>
  );
}

export function AlertContainer({
  alerts,
  onDismiss,
}: {
  alerts: Array<AlertProps & { id: string }>;
  onDismiss: (id: string) => void;
}) {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          {...alert}
          onDismiss={() => onDismiss(alert.id)}
        />
      ))}
    </div>
  );
}
