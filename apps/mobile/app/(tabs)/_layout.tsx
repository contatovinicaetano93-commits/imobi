import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const hidden = { display: "none" as const };
const visible = {};

export default function TabLayout() {
  const { userTipo } = useAuth();

  const showObras   = !userTipo || userTipo === "TOMADOR" || userTipo === "GESTOR" || userTipo === "GESTOR_FUNDO" || userTipo === "ADMIN" || userTipo === "CONSTRUTOR";
  const showCredito = !userTipo || userTipo === "TOMADOR" || userTipo === "GESTOR" || userTipo === "GESTOR_FUNDO" || userTipo === "ADMIN";
  const showNotificacoes = !!userTipo;

  function tabIcon(name: IoniconName) {
    return ({ color, size }: { color: string; size: number }) => (
      <Ionicons name={name} size={size} color={color} />
    );
  }

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
        name="obras/index"
        options={{
          title: "Obras",
          tabBarIcon: tabIcon("home"),
          tabBarItemStyle: showObras ? visible : hidden,
        }}
      />
      <Tabs.Screen
        name="credito/index"
        options={{
          title: "Crédito",
          tabBarIcon: tabIcon("calculator"),
          tabBarItemStyle: showCredito ? visible : hidden,
        }}
      />
      <Tabs.Screen
        name="notificacoes/index"
        options={{
          title: "Avisos",
          tabBarIcon: tabIcon("notifications"),
          tabBarItemStyle: showNotificacoes ? visible : hidden,
        }}
      />
      <Tabs.Screen
        name="perfil/index"
        options={{
          title: "Perfil",
          tabBarIcon: tabIcon("person"),
        }}
      />
    </Tabs>
  );
}
