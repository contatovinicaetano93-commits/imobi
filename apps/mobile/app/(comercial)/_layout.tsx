import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ComercialLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   "#1B4FD8",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: { borderTopColor: "#E2E8F0", backgroundColor: "#FFFFFF", height: 60, paddingBottom: 8 },
        headerShown: false,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pipeline"
        options={{
          title: "Pipeline",
          tabBarIcon: ({ color, size }) => <Ionicons name="funnel" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
