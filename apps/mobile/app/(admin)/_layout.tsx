import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";

export default function AdminLayout() {
  const [pendingValidacao, setPendingValidacao] = useState(0);
  const [pendingKyc, setPendingKyc] = useState(0);

  useEffect(() => {
    const check = async () => {
      const [valResult, ovResult] = await Promise.allSettled([
        adminApi.listarEtapasAguardandoValidacao(1, 0),
        adminApi.overview(),
      ]);
      if (valResult.status === "fulfilled") setPendingValidacao(valResult.value.total);
      if (ovResult.status === "fulfilled") setPendingKyc(ovResult.value.kycPendentes);
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
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="validacoes"
        options={{
          title: "Validações",
          tabBarBadge: pendingValidacao > 0 ? pendingValidacao : undefined,
          tabBarBadgeStyle: { backgroundColor: "#F59E0B" },
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="kyc"
        options={{
          title: "KYC",
          tabBarBadge: pendingKyc > 0 ? pendingKyc : undefined,
          tabBarBadgeStyle: { backgroundColor: "#EF4444" },
          tabBarIcon: ({ color, size }) => <Ionicons name="id-card" size={size} color={color} />,
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
