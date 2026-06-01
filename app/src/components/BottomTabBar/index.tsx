import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

interface TabBarProps {
  activeTab: "inicio" | "novavenda" | "vendas" | "rota";
  onTabPress: (tab: "inicio" | "novavenda" | "vendas" | "rota") => void;
}

export function BottomTabBar({ activeTab, onTabPress }: TabBarProps) {
  const tabs = [
    { id: "inicio", label: "Início", icon: "home" },
    { id: "novavenda", label: "Nova Venda", icon: "shopping-bag" },
    { id: "vendas", label: "Vendas", icon: "dollar-sign" },
    { id: "rota", label: "Recebimentos", icon: "map" },
  ] as const;

  return (
    <View className="flex-row bg-light-dark rounded-lg p-3 justify-around items-center my-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            className="items-center flex-1"
            onPress={() => onTabPress(tab.id)}
          >
            <View className="items-center justify-center">
              <Feather
                name={tab.icon as any}
                size={20}
                color={isActive ? "#3C096C" : "#5A189A"}
              />
              {isActive && (
                <Text className="text-xs font-bold text-primary-dark mt-1">{tab.label}</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
