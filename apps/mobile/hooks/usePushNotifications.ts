import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { pushApi } from "../lib/api";

// Registers the Expo push token with the backend once per session.
// Requires expo-notifications to be installed:
//   npx expo install expo-notifications
// and configured in app.config.ts:
//   android: { googleServicesFile: "./google-services.json" }
//   ios: { bundleIdentifier: "...", googleServicesFile: "./GoogleService-Info.plist" }

export function usePushNotifications() {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;

    async function setup() {
      try {
        // Dynamic import so the app doesn't crash if expo-notifications is not installed
        const Notifications = await import("expo-notifications").catch(() => null);
        if (!Notifications) return;

        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;

        if (existing !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") return;

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "IMOBI",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#1B4FD8",
          });
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        });

        await pushApi.registrarToken(tokenData.data);
        registered.current = true;
      } catch {
        // Silently ignore — push is not required for the app to function
      }
    }

    setup();
  }, []);
}
