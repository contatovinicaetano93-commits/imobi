import { Stack } from "expo-router";

export default function AuthenticatedLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="kyc" options={{ title: "KYC" }} />
      <Stack.Screen name="evidencias" options={{ title: "Evidências" }} />
    </Stack>
  );
}
