import { Stack } from "expo-router";

export default function ObrasLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="criar" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
