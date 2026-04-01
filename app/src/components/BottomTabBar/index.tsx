import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { Feather } from '@expo/vector-icons';

interface TabBarProps {
  activeTab: 'inicio' | 'novavenda' | 'vendas' | 'rota';
  onTabPress: (tab: 'inicio' | 'novavenda' | 'vendas' | 'rota') => void;
}

export function BottomTabBar({ activeTab, onTabPress }: TabBarProps) {
  const tabs = [
    { id: 'inicio', label: 'Início', icon: 'home' },
    { id: 'novavenda', label: 'Nova Venda', icon: 'shopping-bag' },
    { id: 'vendas', label: 'Vendas', icon: 'dollar-sign' },
    { id: 'rota', label: 'Rota', icon: 'map' },
  ] as const;

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onTabPress(tab.id)}
          >
            <View style={styles.iconContainer}>
              <Feather
                name={tab.icon as any}
                size={20}
                color={isActive ? colors.primary.dark : colors.primary.main}
              />
              {isActive && <Text style={styles.label}>{tab.label}</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.light.dark,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 4,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary.dark,
    marginTop: 4,
  },
});
