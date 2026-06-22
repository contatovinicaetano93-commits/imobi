import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function GestorTabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: "#7C3AED",
      tabBarInactiveTintColor: "#94A3B8",
      tabBarStyle: { height: 60, paddingBottom: 8, borderTopColor: "#E2E8F0" },
      headerShown: false,
    }}>
      <Tabs.Screen name="dashboard/index" options={{
        title: "Fundo",
        tabBarIcon: ({ color, size }) => <Ionicons name="analytics" size={size} color={color} />,
      }} />
      <Tabs.Screen name="filas/index" options={{
        title: "Monitorar",
        tabBarIcon: ({ color, size }) => <Ionicons name="eye" size={size} color={color} />,
      }} />
      <Tabs.Screen name="comite/index" options={{
        title: "Comitê",
        tabBarIcon: ({ color, size }) => <Ionicons name="briefcase" size={size} color={color} />,
      }} />
      <Tabs.Screen name="perfil/index" options={{
        title: "Perfil",
        tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
