import { Stack } from "expo-router";

export default function CreditoLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="simular" />
      <Stack.Screen name="resultado" />
    </Stack>
  );
}
