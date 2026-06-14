import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function FundoLayout() {
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
        name="carteira"
        options={{
          title: "Carteira",
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="riscos"
        options={{
          title: "Riscos",
          tabBarIcon: ({ color, size }) => <Ionicons name="shield" size={size} color={color} />,
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
