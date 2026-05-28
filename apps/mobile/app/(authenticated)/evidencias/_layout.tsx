import { Stack } from "expo-router";

export default function EvidenciasLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#fff",
        },
        headerTintColor: "#16a34a",
        headerTitleStyle: {
          fontWeight: "600",
        },
      }}
    >
      <Stack.Screen
        name="[obraId]/index"
        options={{
          title: "Evidências",
          headerBackTitle: "Voltar",
        }}
      />
      <Stack.Screen
        name="[obraId]/capture"
        options={{
          title: "Capturar Foto",
          headerBackTitle: "Voltar",
        }}
      />
      <Stack.Screen
        name="[obraId]/upload"
        options={{
          title: "Registrar Evidência",
          headerBackTitle: "Voltar",
        }}
      />
    </Stack>
  );
}
