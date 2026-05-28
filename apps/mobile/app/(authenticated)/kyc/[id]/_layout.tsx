import { Stack } from "expo-router";

export default function KycIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="upload" />
      <Stack.Screen name="preview" />
    </Stack>
  );
}
