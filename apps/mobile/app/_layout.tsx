import { useEffect } from "react";
import { Stack } from "expo-router";
import { initializeCsrfToken } from "../lib/api";

export default function RootLayout() {
  useEffect(() => {
    // Initialize CSRF token when app starts
    initializeCsrfToken();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(authenticated)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
