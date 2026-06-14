import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ComercialLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#ea580c",
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
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pipeline/index"
        options={{
          title: "Pipeline",
          tabBarIcon: ({ color, size }) => <Ionicons name="funnel" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
