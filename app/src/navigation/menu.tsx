import React from 'react';
import { View, Text, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useSync } from '../context/SyncContext';

type NavItem = {
  label: string;
  icon: string;
  screen?: string;
  action?: () => void;
};

const SYNC_STATUS_CONFIG = {
  idle:    { color: '#8B5A96', label: 'Nunca sincronizado' },
  syncing: { color: '#4285F4', label: 'Sincronizando...' },
  synced:  { color: '#1B8A3D', label: 'Sincronizado' },
  error:   { color: '#DF1515', label: 'Erro na sincronização' },
};

export default function Menu() {
  const navigation = useNavigation();
  const { user }   = useAuth();
  const { status, pendingCount, lastSyncAt, autoSync, setAutoSync, sync } = useSync();

  const meta      = (user as any)?.user_metadata ?? {};
  const fullName  = meta.full_name ?? meta.name ?? '';
  const email     = user?.email ?? '';
  const initials  = fullName
    .trim().split(' ').filter(Boolean).slice(0, 2)
    .map((w: string) => w[0].toUpperCase()).join('') || email.slice(0, 2).toUpperCase();

  const navigate = (screen: string) => {
    navigation.navigate('App' as never, { screen } as never);
  };

  const goToAndClose = (screen: string) => {
    navigation.goBack();
    setTimeout(() => navigate(screen), 50);
  };

  const syncCfg    = SYNC_STATUS_CONFIG[status];
  const hasPending = pendingCount > 0;

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
          { label: 'Produtos',  icon: 'box',   screen: 'Products' },
          { label: 'Clientes',  icon: 'users', screen: 'Clients'  },
          { label: 'Regiões',   icon: 'map',   screen: 'Regioes'  },
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

      {/* Sincronização */}
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 }}>
        SINCRONIZAÇÃO
      </Text>
      <View style={{ marginBottom: 28, gap: 2 }}>
        {/* Status badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
          {status === 'syncing' ? (
            <ActivityIndicator size="small" color="#4285F4" />
          ) : (
            <View style={{
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: hasPending ? '#FF8C00' : syncCfg.color,
            }} />
          )}
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
            {hasPending ? `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}` : syncCfg.label}
          </Text>
          {hasPending && (
            <View style={{
              backgroundColor: '#DF1515', borderRadius: 10,
              paddingHorizontal: 6, paddingVertical: 2,
            }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{pendingCount}</Text>
            </View>
          )}
        </View>

        {lastSyncAt && (
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 6 }}>
            Última sync: {lastSyncAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}

        {/* Auto-sync toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Feather name="zap" size={18} color="rgba(255,255,255,0.65)" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Sync automático</Text>
          </View>
          <Switch
            value={autoSync}
            onValueChange={setAutoSync}
            trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#758C36' }}
            thumbColor={autoSync ? '#C4D680' : 'rgba(255,255,255,0.6)'}
          />
        </View>

        {/* Manual sync button */}
        <TouchableOpacity
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
            opacity: status === 'syncing' ? 0.5 : 1,
          }}
          onPress={sync}
          disabled={status === 'syncing'}
        >
          <Feather name="refresh-cw" size={20} color="rgba(196,214,128,0.9)" />
          <Text style={{ fontSize: 16, fontWeight: '600', color: 'rgba(196,214,128,0.9)' }}>
            {status === 'syncing' ? 'Sincronizando...' : 'Sincronizar agora'}
          </Text>
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
