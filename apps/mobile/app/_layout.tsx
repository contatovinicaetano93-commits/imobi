import { useEffect, useState } from "react";
import { View, ActivityIndicator, LogBox, DeviceEventEmitter } from "react-native";

if (__DEV__) {
  LogBox.ignoreAllLogs();
}

if (__DEV__) {
  // The Expo dev-client network inspector opens in "Inspect" mode by default,
  // which places a full-screen touch interceptor. Emit the toggle event to
  // close it shortly after the JS runtime starts.
  setTimeout(() => DeviceEventEmitter.emit('toggleElementInspector'), 800);
}
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useRouter, useSegments } from "expo-router";
import { setOnUnauthorized, setOnSignedIn } from "../lib/api";
import { initMobileSentry, Sentry } from "../lib/sentry";
import { authenticateWithBiometry, isBiometryEnabled } from "../lib/biometry";
import { registerForPushNotifications, addNotificationListeners } from "../lib/push-notifications";
import { resolvePostLoginRoute } from "../lib/jornada";
import { NetworkStatusBanner } from "../hooks/use-network-status";

initMobileSentry();

type RootLayoutProps = {
  children?: React.ReactNode;
};

function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    setOnUnauthorized(() => {
      setIsSignedIn(false);
    });
    setOnSignedIn(() => {
      setIsSignedIn(true);
    });
  }, []);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        if (!token) {
          setIsSignedIn(false);
          return;
        }

        const bioEnabled = await isBiometryEnabled();
        if (bioEnabled) {
          const ok = await authenticateWithBiometry();
          if (!ok) {
            await SecureStore.deleteItemAsync("accessToken");
            await SecureStore.deleteItemAsync("refreshToken");
            setIsSignedIn(false);
            return;
          }
        }

        setIsSignedIn(true);
        void registerForPushNotifications();
      } catch (e) {
        console.error("Failed to restore session", e);
        setIsSignedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    return addNotificationListeners();
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";
    const onWelcome = !segments[0] || segments[0] === "index";

    if (isSignedIn && (inAuthGroup || onWelcome)) {
      void resolvePostLoginRoute().then((dest) => {
        router.replace(dest as never);
      });
    } else if (!isSignedIn && inTabsGroup) {
      router.replace("/");
    }
  }, [isSignedIn, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <NetworkStatusBanner />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            gestureEnabled: false,
            animation: "none",
          }}
        />
        <Stack.Screen
          name="(auth)"
          options={{
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            gestureEnabled: false,
          }}
        />
      </Stack>
    </View>
  );
}

export default Sentry.wrap(RootLayout);
