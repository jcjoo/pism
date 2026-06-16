import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GeoStatus, GEO_CFG } from './types';
import { colors } from '@/theme/color';

interface GeoBadgeProps {
  status: GeoStatus;
  lat:    number | null | undefined;
  lon:    number | null | undefined;
}

export function GeoBadge({ status, lat, lon }: GeoBadgeProps) {
  if (status === 'idle') return null;

  const geo = GEO_CFG[status];

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: geo.bg, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 7,
      marginTop: 6, gap: 7,
    }}>
      {status === 'loading' ? (
        <ActivityIndicator size="small" color={colors.primary.main} />
      ) : (
        <Feather name={geo.icon as any} size={13} color={geo.color} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: geo.color }}>
          {geo.label}
        </Text>
        {(status === 'address' || status === 'city') && lat != null && lon != null && (
          <Text style={{ fontSize: 10, color: '#666', marginTop: 1 }}>
            {lat.toFixed(5)}, {lon.toFixed(5)}
          </Text>
        )}
      </View>
    </View>
  );
}
