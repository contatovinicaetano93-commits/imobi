import type { ExpoConfig } from "expo/config";

const EAS_PROJECT_ID = "6bf955c5-863a-4344-ac39-6a55c89658d4";

const config: ExpoConfig = {
  name:        "IMOBI",
  slug:        "imbobi",
  version:     "1.0.0",
  orientation: "portrait",
  icon:        "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image:           "./assets/splash.png",
    resizeMode:      "contain",
    backgroundColor: "#0C1A3D",
  },
  runtimeVersion: { policy: "appVersion" },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.imbobi.app",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "O IMOBI precisa da sua localização para validar que você está na obra antes de enviar a foto.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "O IMOBI precisa da sua localização para validar o registro de obra.",
      NSCameraUsageDescription:
        "O IMOBI precisa da câmera para registrar o progresso da sua obra.",
      NSPhotoLibraryUsageDescription:
        "O IMOBI precisa acessar suas fotos para enviar evidências da obra.",
    },
  },
  android: {
    package: "com.imbobi.app",
    adaptiveIcon: {
      foregroundImage:  "./assets/adaptive-icon.png",
      backgroundColor:  "#0C1A3D",
    },
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
  extra: {
    apiUrl: process.env["EXPO_PUBLIC_API_URL"],
    eas: { projectId: EAS_PROJECT_ID },
  },
};

export default config;
