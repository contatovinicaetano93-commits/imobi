import { Stack } from "expo-router";

export default function ObrasLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]/index"
        options={{
          animationEnabled: true,
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="[id]/registrar"
        options={{
          animationEnabled: true,
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="[id]/etapa/[etapaId]"
        options={{
          animationEnabled: true,
          presentation: "card",
        }}
      />
    </Stack>
  );
}
