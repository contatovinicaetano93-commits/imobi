import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#7c3aed",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { borderTopColor: "#f3f4f6", backgroundColor: "#fff", borderTopWidth: 1 },
        headerShown: false,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="dashboard/index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="etapas/index"
        options={{
          title: "Validar",
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
