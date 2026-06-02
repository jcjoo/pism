import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Auth,
  Home,
  NewSale,
  Sales,
  Products,
  Clients,
  Recebimentos,
  Conta,
  Relatorios,
} from "../screens";
import { useAuth } from "../hooks/useAuth";
import Header from "./header";
import Menu from "./menu";

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ name, color, focused, label }: { name: any; color: string; focused: boolean; label: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: 72, paddingTop: 4 }}>
      <View style={{
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? "rgba(60, 9, 108, 0.1)" : "transparent",
        borderRadius: 12,
        width: 52,
        height: 32,
      }}>
        <Feather name={name} size={22} color={color} />
      </View>
      <Text style={{ fontSize: 10, color, fontWeight: focused ? "700" : "400", marginTop: 2, textAlign: "center" }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function AppTabs() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const displayName = (() => {
    const meta = (user as any)?.user_metadata;
    if (meta?.full_name) return meta.full_name.split(' ')[0];
    if (meta?.name)      return meta.name.split(' ')[0];
    if (user?.email)     return user.email.split('@')[0];
    return 'você';
  })();

  const tabBarStyle = {
    backgroundColor: "#E1DAE8",
    borderTopWidth: 1,
    borderTopColor: "#D5CBE0",
    height: 60 + insets.bottom,
    paddingBottom: insets.bottom,
    paddingTop: 0,
    elevation: 8,
    shadowColor: "#3C096C",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        header: (props) => <Header {...props} />,
        tabBarStyle,
        tabBarActiveTintColor: "#3C096C",
        tabBarInactiveTintColor: "#9B8AAA",
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={Home}
        options={{
          headerTitle: `Bem-vindo, ${displayName}`,
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} label="Início" />,
        }}
      />

      <Tab.Screen
        name="NovaVenda"
        component={NewSale}
        options={{
          headerTitle: "Nova Venda",
          tabBarIcon: ({ color, focused }) => <TabIcon name="shopping-bag" color={color} focused={focused} label="Nova Venda" />,
        }}
      />

      <Tab.Screen
        name="Vendas"
        component={Sales}
        options={{
          headerTitle: "Consultar Vendas",
          tabBarIcon: ({ color, focused }) => <TabIcon name="dollar-sign" color={color} focused={focused} label="Vendas" />,
        }}
      />

      <Tab.Screen
        name="Rota"
        component={Recebimentos}
        options={{
          headerTitle: "Recebimentos",
          tabBarIcon: ({ color, focused }) => <TabIcon name="map" color={color} focused={focused} label="Recebimentos" />,
        }}
      />

      <Tab.Screen
        name="Clients"
        component={Clients}
        options={{ headerShown: false, tabBarItemStyle: { display: "none" } }}
      />

      <Tab.Screen
        name="Products"
        component={Products}
        options={{ headerShown: false, tabBarItemStyle: { display: "none" } }}
      />

      <Tab.Screen
        name="Conta"
        component={Conta}
        options={{ headerShown: false, tabBarItemStyle: { display: "none" } }}
      />

      <Tab.Screen
        name="Relatorios"
        component={Relatorios}
        options={{ headerShown: false, tabBarItemStyle: { display: "none" } }}
      />
    </Tab.Navigator>
  );
}

export function Navigation() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={Auth} />
        ) : (
          <>
            <Stack.Screen name="App" component={AppTabs} />
            <Stack.Screen
              name="Menu"
              component={Menu}
              options={{ presentation: "modal", animation: "slide_from_right" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
