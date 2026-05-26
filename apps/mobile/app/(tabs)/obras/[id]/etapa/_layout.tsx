import { Stack } from "expo-router";

export default function EtapaLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="[etapaId]"
        options={{
          animation: "slide_from_right",
          presentation: "card",
        }}
      />
    </Stack>
  );
}
