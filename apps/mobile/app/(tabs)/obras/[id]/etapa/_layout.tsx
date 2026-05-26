import { Stack } from "expo-router";

export default function EtapaLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="[etapaId]"
        options={{
          animationEnabled: true,
          presentation: "card",
        }}
      />
    </Stack>
  );
}
