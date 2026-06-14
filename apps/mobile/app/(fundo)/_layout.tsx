import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function FundoLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#0f766e",
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
          tabBarIcon: ({ color, size }) => <Ionicons name="trending-up" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
