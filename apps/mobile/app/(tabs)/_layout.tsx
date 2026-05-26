import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#16a34a",
        tabBarStyle: { borderTopColor: "#f3f4f6", backgroundColor: "#fff" },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="obras/index" options={{ title: "Obras" }} />
      <Tabs.Screen name="credito/index" options={{ title: "Crédito" }} />
      <Tabs.Screen name="perfil/index" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
