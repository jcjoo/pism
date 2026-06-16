import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PeriodFilter } from '@/services/relatorios.service';
import { PERIODS, RANK_COLORS, RANK_DEFAULT } from './helpers';
import { colors } from '@/theme/color';

export function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View className="page-header">
      <TouchableOpacity onPress={onBack} className="mr-3 p-1">
        <Feather name="chevron-left" size={28} color={colors.primary.dark} />
      </TouchableOpacity>
      <Text className="page-title">{title}</Text>
    </View>
  );
}

export function PeriodChips({ value, onChange }: { value: PeriodFilter; onChange: (p: PeriodFilter) => void }) {
  return (
    <ScrollView
      horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 8 }}
    >
      {PERIODS.map(p => (
        <TouchableOpacity
          key={p.value}
          onPress={() => onChange(p.value)}
          className={value === p.value ? 'filter-chip-active' : 'filter-chip'}
        >
          <Text className={`text-[12px] font-semibold ${value === p.value ? 'text-white' : 'text-primary'}`}>
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ paddingTop: 60, alignItems: 'center', gap: 10 }}>
      <Feather name={icon as any} size={40} color="#C4B5D0" />
      <Text className="empty-text">{text}</Text>
    </View>
  );
}

export function RankBadge({ rank }: { rank: number }) {
  const c = RANK_COLORS[rank] ?? RANK_DEFAULT;
  return (
    <View style={{
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: c.badge,
      alignItems: 'center', justifyContent: 'center', marginRight: 10,
    }}>
      <Text style={{ fontWeight: '800', fontSize: 12, color: c.text }}>{rank + 1}</Text>
    </View>
  );
}

export function TopCard({ rank, title, stats }: {
  rank: number;
  title: string;
  stats: { label: string; value: string }[];
}) {
  const c = RANK_COLORS[rank] ?? RANK_DEFAULT;
  return (
    <View style={{
      backgroundColor: c.bg, borderRadius: 16, padding: 20,
      borderWidth: 1.5, borderColor: c.badge, marginBottom: 16,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{
          width: 34, height: 34, borderRadius: 17,
          backgroundColor: c.badge, alignItems: 'center', justifyContent: 'center', marginRight: 10,
        }}>
          <Text style={{ fontWeight: '800', fontSize: 15, color: c.text }}>{rank + 1}</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.primary.dark }} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 24 }}>
        {stats.map(s => (
          <View key={s.label}>
            <Text style={{ fontSize: 11, color: colors.primary.light, fontWeight: '600', marginBottom: 2 }}>{s.label}</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary.dark }}>{s.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function PropBar({ ratio, color }: { ratio: number; color: string }) {
  return (
    <View style={{ height: 4, backgroundColor: colors.light.main, borderRadius: 2, marginBottom: 6, marginTop: 8 }}>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: color, width: `${Math.round(ratio * 100)}%` }} />
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ paddingTop: 60, alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary.dark} />
    </View>
  );
}
