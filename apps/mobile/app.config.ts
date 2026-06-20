import type { ExpoConfig } from "expo/config";

const EAS_PROJECT_ID = "6bf955c5-863a-4344-ac39-6a55c89658d4";

const config: ExpoConfig = {
  name: "imbobi",
  slug: "imbobi",
  version: "1.0.0",
  description: "Crédito para obra com liberação por etapa, validação GPS e acompanhamento mobile.",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  splash: { image: "./assets/splash.png", resizeMode: "contain", backgroundColor: "#15803d" },
  runtimeVersion: { policy: "appVersion" },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.imbobi.app",
    buildNumber: "1",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "O imbobi precisa da sua localização para validar que você está na obra antes de enviar a foto.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "O imbobi precisa da sua localização para validar o registro de obra.",
      NSCameraUsageDescription:
        "O imbobi precisa da câmera para registrar o progresso da sua obra.",
      NSPhotoLibraryUsageDescription:
        "O imbobi precisa acessar suas fotos para enviar evidências da obra.",
      NSFaceIDUsageDescription:
        "O imbobi usa Face ID para desbloquear o app com segurança.",
      UIBackgroundModes: ["remote-notification"],
    },
  },
  android: {
    package: "com.imbobi.app",
    versionCode: 1,
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#15803d" },
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "USE_BIOMETRIC",
      "USE_FINGERPRINT",
      "RECEIVE_BOOT_COMPLETED",
      "VIBRATE",
    ],
  },
  plugins: [
    "expo-router",
    ["expo-location", { locationAlwaysAndWhenInUsePermission: "Validação de presença na obra." }],
    "expo-camera",
    "expo-secure-store",
    "expo-updates",
    "expo-local-authentication",
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#15803d",
      },
    ],
  ],
  extra: {
    apiUrl: process.env["EXPO_PUBLIC_API_URL"],
    eas: { projectId: EAS_PROJECT_ID },
  },
};

export default config;
