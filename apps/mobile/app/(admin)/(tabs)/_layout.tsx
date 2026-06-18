import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function AdminTabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: "#DC2626",
      tabBarInactiveTintColor: "#94A3B8",
      tabBarStyle: { height: 60, paddingBottom: 8, borderTopColor: "#E2E8F0" },
      headerShown: false,
    }}>
      <Tabs.Screen name="dashboard/index" options={{
        title: "Painel",
        tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
      }} />
      <Tabs.Screen name="aprovacoes/index" options={{
        title: "Aprovar",
        tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done" size={size} color={color} />,
      }} />
      <Tabs.Screen name="comite/index" options={{
        title: "Comitê",
        tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
      }} />
      <Tabs.Screen name="perfil/index" options={{
        title: "Perfil",
        tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
