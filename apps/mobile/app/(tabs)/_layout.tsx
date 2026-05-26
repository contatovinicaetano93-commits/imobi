import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#16a34a",
        tabBarStyle: { borderTopColor: "#f3f4f6", backgroundColor: "#fff" },
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="obras/index" options={{ title: "Obras", tabBarLabel: "Obras" }} />
      <Tabs.Screen name="marketplace/index" options={{ title: "Parceiros", tabBarLabel: "Parceiros" }} />
      <Tabs.Screen name="credito/index" options={{ title: "Crédito", tabBarLabel: "Crédito" }} />
      <Tabs.Screen name="notificacoes/index" options={{ title: "Notificações", tabBarLabel: "Notifs" }} />
      <Tabs.Screen name="perfil/index" options={{ title: "Perfil", tabBarLabel: "Perfil" }} />
    </Tabs>
  );
}
