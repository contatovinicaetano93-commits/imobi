import * as admin from "firebase-admin";

/**
 * Production-ready Firebase Cloud Messaging (FCM) configuration
 *
 * FCM is used for:
 * - Push notifications on mobile apps (Expo)
 * - Real-time updates (optional)
 * - Analytics integration (optional)
 */

export interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  databaseUrl?: string;
}

export interface FCMSettings {
  // Notification behavior
  notificationTtl: number; // Time to live in seconds (default: 2419200 = 28 days)
  collapseKey?: string; // Group multiple notifications
  priority: "high" | "normal"; // "high" for important notifications

  // Retry strategy
  maxRetries: number;
  retryDelayMs: number;

  // Logging
  enableLogging: boolean;
}

/**
 * Get Firebase configuration from environment
 */
export const getFirebaseConfig = (): FirebaseConfig | null => {
  const projectId = process.env["FIREBASE_PROJECT_ID"];
  const privateKey = process.env["FIREBASE_PRIVATE_KEY"];
  const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"];

  if (!projectId || !privateKey || !clientEmail) {
    return null;
  }

  return {
    projectId,
    privateKey: privateKey.replace(/\\n/g, "\n"),
    clientEmail,
    databaseUrl: process.env["FIREBASE_DATABASE_URL"],
  };
};

/**
 * Get FCM settings from environment
 */
export const getFCMSettings = (): FCMSettings => {
  const isProduction = process.env["NODE_ENV"] === "production";

  return {
    notificationTtl: Number(process.env["FCM_TTL"] || 2419200), // 28 days
    priority: isProduction ? "high" : "normal",
    maxRetries: Number(process.env["FCM_MAX_RETRIES"] || 3),
    retryDelayMs: Number(process.env["FCM_RETRY_DELAY_MS"] || 1000),
    enableLogging: process.env["FCM_DEBUG"] === "true" || !isProduction,
  };
};

/**
 * Initialize Firebase Admin SDK
 */
export const initializeFirebaseAdmin = (): admin.messaging.Messaging | null => {
  const config = getFirebaseConfig();

  if (!config) {
    console.warn("Firebase configuration not found - FCM disabled");
    return null;
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.projectId,
          privateKey: config.privateKey,
          clientEmail: config.clientEmail,
        } as admin.ServiceAccount),
        databaseURL: config.databaseUrl,
      });
    }

    return admin.messaging();
  } catch (error) {
    console.error("Firebase initialization error:", error);
    return null;
  }
};

/**
 * FCM notification templates
 */
export enum FCMNotificationType {
  ETAPA_APROVADA = "ETAPA_APROVADA",
  PARCELA_LIBERADA = "PARCELA_LIBERADA",
  KYC_APROVADO = "KYC_APROVADO",
  KYC_REJEITADO = "KYC_REJEITADO",
  OBRA_COMENTARIO = "OBRA_COMENTARIO",
  MARKETPLACE_MATCH = "MARKETPLACE_MATCH",
  DISPUTA_NOTIFICACAO = "DISPUTA_NOTIFICACAO",
  SISTEMA_ALERT = "SISTEMA_ALERT",
}

export const FCM_NOTIFICATION_DEFAULTS = {
  // Notification priority levels for different event types
  [FCMNotificationType.ETAPA_APROVADA]: {
    priority: "high",
    ttl: 2419200, // Standard 28 days
    badge: "1",
  },
  [FCMNotificationType.PARCELA_LIBERADA]: {
    priority: "high",
    ttl: 2419200,
    badge: "2",
  },
  [FCMNotificationType.KYC_APROVADO]: {
    priority: "high",
    ttl: 2419200,
    badge: "3",
  },
  [FCMNotificationType.KYC_REJEITADO]: {
    priority: "high",
    ttl: 2419200,
    badge: "4",
  },
  [FCMNotificationType.OBRA_COMENTARIO]: {
    priority: "normal",
    ttl: 604800, // 7 days
    badge: "5",
  },
  [FCMNotificationType.MARKETPLACE_MATCH]: {
    priority: "normal",
    ttl: 604800,
    badge: "6",
  },
  [FCMNotificationType.DISPUTA_NOTIFICACAO]: {
    priority: "high",
    ttl: 2419200,
    badge: "7",
  },
  [FCMNotificationType.SISTEMA_ALERT]: {
    priority: "high",
    ttl: 86400, // 1 day
    badge: "8",
  },
} as const;

/**
 * Supported device types for FCM
 */
export enum DeviceType {
  IOS = "iOS",
  ANDROID = "Android",
  WEB = "Web",
}

/**
 * FCM token validation regex
 */
export const FCM_TOKEN_REGEX =
  /^[a-zA-Z0-9_-]{152,256}$/; // Standard FCM token format (Firebase format)

/**
 * Validate if token looks like a valid FCM token
 */
export const isValidFCMToken = (token: string): boolean => {
  if (!token || typeof token !== "string") return false;
  // FCM tokens are typically long alphanumeric strings
  return token.length > 100 && /^[a-zA-Z0-9_:\-]+$/.test(token);
};
