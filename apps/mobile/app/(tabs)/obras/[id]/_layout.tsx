import { Stack } from "expo-router";

export default function ObraLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="registrar" />
    </Stack>
  );
}
