import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function EngenheiroLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#d97706",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { borderTopColor: "#f3f4f6", backgroundColor: "#fff", borderTopWidth: 1 },
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="obras/index"
        options={{
          title: "Obras",
          tabBarIcon: ({ color, size }) => <Ionicons name="construct-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="desempenho/index"
        options={{
          title: "Desempenho",
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="obras/[id]" options={{ href: null }} />
      <Tabs.Screen name="obras/[id]/index" options={{ href: null }} />
    </Tabs>
  );
}
