import type { ExpoConfig } from "expo/config";

declare const process: { env: Record<string, string | undefined> };

const config: ExpoConfig = {
  name: "imbobi",
  slug: "imbobi",
  version: "1.0.0",
  sdkVersion: "54.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  splash: { image: "./assets/splash.png", resizeMode: "contain", backgroundColor: "#15803d" },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.imbobi.app",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "O imbobi precisa da sua localização para validar que você está na obra antes de enviar a foto.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "O imbobi precisa da sua localização para validar o registro de obra.",
      NSCameraUsageDescription:
        "O imbobi precisa da câmera para registrar o progresso da sua obra.",
      NSPhotoLibraryUsageDescription:
        "O imbobi precisa acessar suas fotos para enviar evidências da obra.",
    },
  },
  android: {
    package: "com.imbobi.app",
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#15803d" },
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
    ],
  },
  plugins: [
    "expo-router",
    ["expo-location", { locationAlwaysAndWhenInUsePermission: "Validação de presença na obra." }],
    "expo-camera",
    "expo-secure-store",
  ],
  extra: {
    apiUrl: process.env["EXPO_PUBLIC_API_URL"],
    eas: { projectId: process.env["EAS_PROJECT_ID"] },
  },
};

export default config;
