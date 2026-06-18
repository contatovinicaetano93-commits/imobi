import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function EngTabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: "#2563EB",
      tabBarInactiveTintColor: "#94A3B8",
      tabBarStyle: { height: 60, paddingBottom: 8, borderTopColor: "#E2E8F0" },
      headerShown: false,
    }}>
      <Tabs.Screen name="visitas/index" options={{
        title: "Vistorias",
        tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />,
      }} />
      <Tabs.Screen name="comite/index" options={{
        title: "Comitê",
        tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
      }} />
      <Tabs.Screen name="perfil/index" options={{
        title: "Perfil",
        tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
