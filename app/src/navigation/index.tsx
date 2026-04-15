import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Auth, NewSale, Sales } from '../screens';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';
import { supabase } from '../services/supabase';
import { DateTime } from '../components/DateTime'

const PlaceholderScreen = ({ name, onSignOut }: { name: string, onSignOut?: () => void }) => (
  <View style={styles.placeholderContainer}>
    <Text style={styles.placeholderText}>{name}</Text>
    {onSignOut && (
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={onSignOut}
      >
        <Text style={styles.signOutText}>Sair do App</Text>
      </TouchableOpacity>
    )}
    <DateTime
      value={new Date()}
      mode="date"
      onDateChange={() => { }}
    />
    <DateTime
      value={new Date()}
      mode="time"
      onDateChange={() => { }}
    />
  </View>
  //DateTime esta para teste de aparencia, porem nao consegui testar pois nao aparece no computador
);

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AppTabs() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary.dark,
        tabBarInactiveTintColor: colors.primary.main,
        tabBarShowLabel: false,
      })}
    >
      <Tab.Screen
        name="Inicio"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabItem}>
              <Feather name="home" size={20} color={color} />
              {focused && <Text style={styles.tabLabel}>Início</Text>}
            </View>
          ),
        }}
      >
        {() => <PlaceholderScreen name="PISM" onSignOut={handleSignOut} />}
      </Tab.Screen>

      <Tab.Screen
        name="NovaVenda"
        component={NewSale}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabItem}>
              <Feather name="shopping-bag" size={20} color={color} />
              {focused && <Text style={styles.tabLabel}>Nova Venda</Text>}
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Vendas"
        component={Sales}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabItem}>
              <Feather name="dollar-sign" size={20} color={color} />
              {focused && <Text style={styles.tabLabel}>Vendas</Text>}
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Rota"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabItem}>
              <Feather name="map" size={20} color={color} />
              {focused && <Text style={styles.tabLabel}>Rota</Text>}
            </View>
          ),
        }}
      >
        {() => <PlaceholderScreen name="Rota (Em breve)" />}
      </Tab.Screen>
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
          <Stack.Screen name="App" component={AppTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: colors.light.dark,
    borderRadius: 8,
    height: 64,
    borderTopWidth: 0,
    elevation: 0,
    shadowColor: 'transparent',
    paddingBottom: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary.dark,
    marginTop: 2,
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.main,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary.dark,
    marginBottom: 20,
  },
  signOutButton: {
    backgroundColor: colors.primary.dark,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  signOutText: {
    color: colors.light.main,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
