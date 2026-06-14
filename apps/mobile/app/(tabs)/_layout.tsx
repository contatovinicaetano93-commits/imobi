import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { notificacoesApi } from "../../lib/api";

export default function TabLayout() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const check = async () => {
      try {
        const data = await notificacoesApi.contarNaoLidas();
        setUnreadCount(data.count);
      } catch { /* not authenticated yet or network error */ }
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
        tabBarStyle: {
          borderTopColor:   "#E2E8F0",
          backgroundColor:  "#FFFFFF",
          borderTopWidth:   1,
          height:           60,
          paddingBottom:    8,
        },
        headerShown:   false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize:   11,
          fontWeight: "600",
          marginTop:  -2,
        },
      }}
    >
      <Tabs.Screen
        name="obras/index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="credito/index"
        options={{
          title: "Crédito",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notificacoes/index"
        options={{
          title: "Avisos",
          tabBarBadge:      unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: "#EF4444", fontSize: 10, minWidth: 16, height: 16 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil/index"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
