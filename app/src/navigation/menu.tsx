import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';

type NavItem = {
  label: string;
  icon: string;
  screen?: string;
  action?: () => void;
};

const SECTION_DIVIDER = '──';

export default function Menu() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const meta = (user as any)?.user_metadata ?? {};
  const fullName: string = meta.full_name ?? meta.name ?? '';
  const email: string = user?.email ?? '';
  const initials = fullName
    .trim().split(' ').filter(Boolean).slice(0, 2)
    .map((w: string) => w[0].toUpperCase()).join('') || email.slice(0, 2).toUpperCase();

  const navigate = (screen: string) => {
    navigation.navigate('App' as never, { screen } as never);
  };

  const goToAndClose = (screen: string) => {
    navigation.goBack();
    setTimeout(() => navigate(screen), 50);
  };

  return (
    <View className="flex-1 bg-primary-dark p-6">
      <View className="flex-row justify-between items-center mt-10 mb-8">
        <Text className="text-[32px] font-bold text-white">Menu</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="x" size={32} color="white" />
        </TouchableOpacity>
      </View>

      {/* Perfil resumido → Conta */}
      <TouchableOpacity
        onPress={() => goToAndClose('Conta')}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 14,
          backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14,
          padding: 14, marginBottom: 32,
        }}
      >
        <View style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }} numberOfLines={1}>
            {fullName || email}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }} numberOfLines={1}>
            {fullName ? email : 'Ver minha conta'}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>

      {/* Cadastros */}
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 }}>
        CADASTROS
      </Text>
      <View style={{ gap: 4, marginBottom: 28 }}>
        {([
          { label: 'Produtos', icon: 'box',   screen: 'Products' },
          { label: 'Clientes', icon: 'users', screen: 'Clients'  },
        ] as NavItem[]).map((item, i) => (
          <TouchableOpacity
            key={i}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}
            onPress={() => navigate(item.screen!)}
          >
            <Feather name={item.icon as any} size={22} color="rgba(255,255,255,0.7)" />
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Relatórios */}
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 }}>
        RELATÓRIOS
      </Text>
      <View style={{ gap: 4, marginBottom: 28 }}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}
          onPress={() => navigate('Relatorios')}
        >
          <Feather name="bar-chart-2" size={22} color="rgba(255,255,255,0.7)" />
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>Relatórios</Text>
        </TouchableOpacity>
      </View>

      {/* Sair */}
      <View style={{ marginTop: 'auto' as any }}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}
          onPress={() => supabase.auth.signOut()}
        >
          <Feather name="log-out" size={22} color="rgba(255,100,100,0.8)" />
          <Text style={{ fontSize: 20, fontWeight: '700', color: 'rgba(255,100,100,0.9)' }}>Sair do App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
