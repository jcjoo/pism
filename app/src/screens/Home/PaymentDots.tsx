import React from 'react';
import { View, Text } from 'react-native';
import { CalendarPayment } from './types';
import { STATUS_COLOR } from './helpers';
import { colors } from '@/theme/color';

export function PaymentDots({ payments }: { payments: CalendarPayment[] }) {
  const dots  = payments.slice(0, 3);
  const extra = payments.length - 3;
  return (
    <View className="flex-row justify-center gap-[2px] mt-[2px]">
      {dots.map((p, i) => (
        <View
          key={i}
          style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: STATUS_COLOR[p.status] }}
        />
      ))}
      {extra > 0 && (
        <Text style={{ fontSize: 7, color: colors.primary.main, fontWeight: 'bold', lineHeight: 6 }}>+{extra}</Text>
      )}
    </View>
  );
}
