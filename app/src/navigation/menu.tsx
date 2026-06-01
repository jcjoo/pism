import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase';

export default function Menu() {
  const navigation = useNavigation();
  const menuItems = [
    { label: 'Produtos', screen: 'Products' },
    { label: 'Clientes', screen: 'Clients' },
    { label: 'Perfil' },
    { label: 'Conta' },
    { label: 'Configurações' },
    { label: 'Sair do App', action: () => supabase.auth.signOut() },
  ];

  return (
    <View className="flex-1 bg-primary-dark p-6">
      <View className="flex-row justify-between items-center mt-10 mb-[60px]">
        <Text className="text-[32px] font-bold text-white">Menu</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="x" size={32} color="white" />
        </TouchableOpacity>
      </View>

      <View className="gap-6">
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            className="py-2"
            onPress={() => {
              if (item.screen) {
                navigation.navigate('App' as never, { screen: item.screen } as never);
              } else if (item.action) {
                item.action();
              }
            }}
          >
            <Text className="text-2xl font-bold text-white">{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
