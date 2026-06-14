import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function EngenheiroLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { borderTopColor: "#f3f4f6", backgroundColor: "#fff", borderTopWidth: 1 },
        headerShown: false,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="vistorias/index"
        options={{
          title: "Vistorias",
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="obras/index"
        options={{
          title: "Obras",
          tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
