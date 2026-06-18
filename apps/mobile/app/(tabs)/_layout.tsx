import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { normalizeUserRole, roleCanAccessMobileTab, type AppRole } from "@imbobi/schemas";

export default function TabLayout() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync("userRole")
      .then((storedRole) => setRole(normalizeUserRole(storedRole)))
      .finally(() => setRoleLoaded(true));
  }, []);

  const canShowTab = (tab: "engenharia" | "comercial" | "obras" | "credito" | "perfil") => {
    if (!roleLoaded) return true;
    return roleCanAccessMobileTab(role, tab);
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#16a34a",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          borderTopColor: "#f3f4f6",
          backgroundColor: "#fff",
          borderTopWidth: 1,
        },
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="engenheiro/index"
        options={{
          title: "Vistorias",
          href: canShowTab("engenharia") ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="comercial/index"
        options={{
          title: "Comercial",
          href: canShowTab("comercial") ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="obras/index"
        options={{
          title: "Obras",
          href: canShowTab("obras") ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="credito/index"
        options={{
          title: "Crédito",
          href: canShowTab("credito") ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calculator" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil/index"
        options={{
          title: "Perfil",
          href: canShowTab("perfil") ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
