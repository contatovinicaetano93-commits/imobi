import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "imbobi",
  slug: "imbobi",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  splash: { image: "./assets/splash.png", resizeMode: "contain", backgroundColor: "#15803d" },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.imbobi.app",
    buildNumber: "1",
    deploymentTarget: "13.4",
    usesIcloudStorage: false,
    entitlements: {
      "keychain-access-groups": ["group.com.imbobi.app"],
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "O imbobi precisa da sua localização para validar que você está na obra antes de enviar a foto.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "O imbobi precisa da sua localização para validar o registro de obra.",
      NSCameraUsageDescription:
        "O imbobi precisa da câmera para registrar o progresso da sua obra.",
      NSPhotoLibraryUsageDescription:
        "O imbobi precisa acessar suas fotos para enviar evidências da obra.",
      NSLocationAlwaysUsageDescription:
        "O imbobi precisa de acesso à localização em background para validar sua presença.",
      UIFileSharingEnabled: false,
      LSSupportsOpeningDocumentsInPlace: false,
    },
  },
  android: {
    package: "com.imbobi.app",
    versionCode: 1,
    minSdkVersion: 24,
    targetSdkVersion: 34,
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#15803d" },
    permissions: [
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
    ],
    usesPermission: [
      {
        name: "android.permission.ACCESS_FINE_LOCATION",
        maxSdkVersion: 32,
      },
    ],
  },
  plugins: [
    "expo-router",
    ["expo-location", { locationAlwaysAndWhenInUsePermission: "Validação de presença na obra." }],
    "expo-camera",
    "expo-secure-store",
    [
      "expo-image-picker",
      {
        photosPermission: "O imbobi precisa acessar suas fotos para enviar evidências da obra.",
        cameraPermission: "O imbobi precisa da câmera para registrar o progresso da sua obra.",
      },
    ],
  ],
  extra: {
    apiUrl: process.env["EXPO_PUBLIC_API_URL"],
    eas: { projectId: process.env["EAS_PROJECT_ID"] },
  },
};

export default config;
