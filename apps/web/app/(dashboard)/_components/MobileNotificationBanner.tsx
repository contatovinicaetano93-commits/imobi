"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  action?: { label: string; href: string };
}

interface MobileNotificationBannerProps {
  notifications?: Notification[];
}

export function MobileNotificationBanner({
  notifications = [
    {
      id: "1",
      type: "success",
      title: "Etapa Aprovada",
      message: "A etapa 'Fundação' foi aprovada. Parcela será liberada em breve.",
      action: { label: "Ver detalhes", href: "/dashboard/obras" },
    },
  ],
}: MobileNotificationBannerProps) {
  const [visible, setVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(notifications.map((n) => [n.id, true]))
  );

  const activeNotifications = notifications.filter((n) => visible[n.id]);

  if (activeNotifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {activeNotifications.map((notif) => {
        const config = {
          info: {
            icon: Info,
            bg: "bg-blue-50",
            border: "border-blue-200",
            text: "text-blue-900",
            iconColor: "text-blue-600",
          },
          success: {
            icon: CheckCircle2,
            bg: "bg-green-50",
            border: "border-green-200",
            text: "text-green-900",
            iconColor: "text-green-600",
          },
          warning: {
            icon: AlertCircle,
            bg: "bg-yellow-50",
            border: "border-yellow-200",
            text: "text-yellow-900",
            iconColor: "text-yellow-600",
          },
          error: {
            icon: AlertCircle,
            bg: "bg-red-50",
            border: "border-red-200",
            text: "text-red-900",
            iconColor: "text-red-600",
          },
        };

        const c = config[notif.type];
        const Icon = c.icon;

        return (
          <div
            key={notif.id}
            className={`rounded-lg border p-3 sm:p-4 flex items-start gap-3 ${c.bg} ${c.border}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${c.iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs sm:text-sm font-semibold ${c.text}`}>{notif.title}</p>
              <p className={`text-xs mt-1 ${c.text} opacity-75`}>{notif.message}</p>
              {notif.action && (
                <a
                  href={notif.action.href}
                  className={`inline-block text-xs font-semibold mt-2 underline hover:no-underline ${c.text}`}
                >
                  {notif.action.label}
                </a>
              )}
            </div>
            <button
              onClick={() => setVisible({ ...visible, [notif.id]: false })}
              className={`flex-shrink-0 p-1 hover:bg-white/50 rounded ${c.text}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
