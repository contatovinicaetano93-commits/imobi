import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Imobi",
  slug: "imobi-app",
  scheme: "imobi",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  splash: { image: "./assets/splash.png", resizeMode: "contain", backgroundColor: "#1B4FD8" },
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
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#1B4FD8" },
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
    "expo-updates",
  ],
  updates: {
    url: "https://u.expo.dev/6bf955c5-863a-4344-ac39-6a55c89658d4",
    enabled: true,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 5000,
  },
  runtimeVersion: {
    policy: "sdkVersion",
  },
  extra: {
    apiUrl: process.env["EXPO_PUBLIC_API_URL"] ?? "https://imobi-api-efgg.onrender.com",
    eas: { projectId: "6bf955c5-863a-4344-ac39-6a55c89658d4" },
  },
};

export default config;
