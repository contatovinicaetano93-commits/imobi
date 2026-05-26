import { Stack } from "expo-router";

export default function ObrasLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]/index"
        options={{
          animation: "slide_from_right",
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="[id]/registrar"
        options={{
          animation: "slide_from_right",
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="[id]/etapa/[etapaId]"
        options={{
          animation: "slide_from_right",
          presentation: "card",
        }}
      />
    </Stack>
  );
}
