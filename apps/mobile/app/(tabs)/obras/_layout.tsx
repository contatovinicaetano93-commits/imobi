import { Stack } from "expo-router";

export default function ObrasLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="cadastrar" options={{ presentation: "modal" }} />
      <Stack.Screen name="selecionar-validacao" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
