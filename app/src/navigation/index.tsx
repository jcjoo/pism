import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import {
  Auth,
  NewSale,
  Sales,
  Products,
  Clients,
  Recebimentos,
} from "../screens";
import { useAuth } from "../hooks/useAuth";
import { colors } from "../theme";
import { DateTime } from "../components/DateTime";
import Header from "./header";
import Menu from "./menu";

const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={styles.placeholderContainer}>
    <Text style={styles.placeholderText}>{name}</Text>
    <DateTime value={new Date()} mode="date" onDateChange={() => {}} />
    <DateTime value={new Date()} mode="time" onDateChange={() => {}} />
  </View>
);

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        header: (props) => <Header {...props} />,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary.dark,
        tabBarInactiveTintColor: colors.primary.main,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen
        name="Inicio"
        options={{
          headerTitle: "PISM",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabItem}>
              <Feather name="home" size={20} color={color} />
              {focused && (
                <Text style={styles.tabLabel} numberOfLines={1}>
                  Início
                </Text>
              )}
            </View>
          ),
        }}
      >
        {() => <PlaceholderScreen name="PISM" />}
      </Tab.Screen>

      <Tab.Screen
        name="NovaVenda"
        component={NewSale}
        options={{
          headerTitle: "Cadastrar nova venda.",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabItem}>
              <Feather name="shopping-bag" size={20} color={color} />
              {focused && (
                <Text style={styles.tabLabel} numberOfLines={1}>
                  Nova Venda
                </Text>
              )}
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Vendas"
        component={Sales}
        options={{
          headerTitle: "Consultar Vendas",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabItem}>
              <Feather name="dollar-sign" size={20} color={color} />
              {focused && (
                <Text style={styles.tabLabel} numberOfLines={1}>
                  Vendas
                </Text>
              )}
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Rota"
        component={Recebimentos}
        options={{
          headerTitle: "Recebimentos",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabItem}>
              <Feather name="map" size={20} color={color} />
              {focused && (
                <Text style={styles.tabLabel} numberOfLines={1}>
                  Recebimentos
                </Text>
              )}
            </View>
          ),
        }}
      />

      {/* Hidden Screens that still show the Tab Bar */}
      <Tab.Screen
        name="Clients"
        component={Clients}
        options={{
          headerShown: false,
          tabBarItemStyle: { display: "none" },
        }}
      />

      <Tab.Screen
        name="Products"
        component={Products}
        options={{
          headerShown: false,
          tabBarItemStyle: { display: "none" },
        }}
      />
    </Tab.Navigator>
  );
}

export function Navigation() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
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
              options={{
                presentation: "modal",
                animation: "slide_from_right",
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: colors.light.dark,
    borderRadius: 20,
    height: 70,
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    paddingBottom: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    flexDirection: "row",
    justifyContent: "center",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 60, // Fixed width to prevent shifting
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary.dark,
    marginTop: 4,
    textAlign: "center",
    width: 80, // Allow label to be slightly wider than icon
  },
  placeholderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.main,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary.dark,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
