import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CalendarPayment, DueStatus } from './types';
import { toDateKey, STATUS_COLOR, STATUS_LABEL, MONTH_NAMES, DOW_LABELS } from './helpers';
import { PaymentDots } from './PaymentDots';
import { colors } from '@/theme/color';

interface CalendarProps {
  viewYear:     number;
  viewMonth:    number;
  calDays:      (Date | null)[];
  paymentMap:   Record<string, CalendarPayment[]>;
  selectedKey:  string | null;
  todayKey:     string;
  onPrevMonth:  () => void;
  onNextMonth:  () => void;
  onDayPress:   (key: string) => void;
}

export function Calendar({
  viewYear, viewMonth, calDays, paymentMap,
  selectedKey, todayKey, onPrevMonth, onNextMonth, onDayPress,
}: CalendarProps) {
  return (
    <View className="mx-4 -mt-3 bg-white rounded-[16px] elevation-3 overflow-hidden">
      {/* Month navigation */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-light-dark">
        <TouchableOpacity onPress={onPrevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="chevron-left" size={22} color={colors.primary.dark} />
        </TouchableOpacity>
        <Text className="text-base font-bold text-primary-dark">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={onNextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="chevron-right" size={22} color={colors.primary.dark} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week header */}
      <View className="flex-row px-2 pt-3 pb-1">
        {DOW_LABELS.map((d, i) => (
          <View key={i} className="flex-1 items-center">
            <Text style={{ fontSize: 11, fontWeight: '700', color: i === 0 ? colors.danger.main : colors.primary.light }}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View className="px-2 pb-3">
        {Array.from({ length: calDays.length / 7 }).map((_, week) => (
          <View key={week} className="flex-row">
            {calDays.slice(week * 7, week * 7 + 7).map((day, col) => {
              if (!day) return <View key={col} className="flex-1 m-[2px] h-[52px]" />;

              const key         = toDateKey(day);
              const isToday     = key === todayKey;
              const isSelected  = key === selectedKey;
              const payments    = paymentMap[key] ?? [];
              const hasPayments = payments.length > 0;
              const isSunday    = col === 0;

              return (
                <TouchableOpacity
                  key={col}
                  className="flex-1 m-[2px] h-[52px] items-center justify-start pt-1.5 rounded-[10px]"
                  style={[
                    isSelected
                      ? { backgroundColor: colors.primary.dark }
                      : isToday
                      ? { backgroundColor: colors.light.dark }
                      : undefined,
                  ]}
                  onPress={() => onDayPress(key)}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: isToday || isSelected ? '800' : '500',
                    color: isSelected ? 'white' : isToday ? colors.primary.dark : isSunday ? colors.danger.main : '#2D1B4E',
                  }}>
                    {day.getDate()}
                  </Text>
                  {hasPayments && (
                    <View style={{ opacity: isSelected ? 0.8 : 1 }}>
                      <PaymentDots payments={payments} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View className="flex-row justify-center gap-4 px-5 pb-4 pt-1 border-t border-light-dark">
        {(['overdue', 'today', 'future'] as DueStatus[]).map(s => (
          <View key={s} className="flex-row items-center gap-1">
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: STATUS_COLOR[s] }} />
            <Text style={{ fontSize: 10, color: colors.primary.light, fontWeight: '600' }}>{STATUS_LABEL[s]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
