import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { vistoriaApi } from "../../lib/api";

export default function EngenheiroLayout() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const check = async () => {
      try {
        const data = await vistoriaApi.listarPendentes(1, 0);
        setPendingCount(data.total);
      } catch {}
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

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
        name="vistorias"
        options={{
          title: "Vistorias",
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: "#EF4444" },
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle" size={size} color={color} />,
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
