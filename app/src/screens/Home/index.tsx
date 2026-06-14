import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { recebimentosService } from '@/services/recebimentos.service';
import { buildPaymentMap, getCalendarDays, renderPrice, todayKey } from './helpers';
import { Calendar } from './Calendar';
import { PaymentDayView } from './PaymentDayView';

export function Home() {
  const navigation = useNavigation<any>();

  const [loading, setLoading]           = useState(true);
  const [paymentMap, setPaymentMap]     = useState<Record<string, any[]>>({});
  const [totalPending, setTotalPending] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  const now = new Date();
  const [viewYear,    setViewYear]    = useState(now.getFullYear());
  const [viewMonth,   setViewMonth]   = useState(now.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(todayKey());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        setLoading(true);
        try {
          const sales = await recebimentosService.getPending();
          if (!active) return;
          const map = buildPaymentMap(sales);
          setPaymentMap(map);
          const allPayments = Object.values(map).flat();
          setTotalPending(allPayments.reduce((a, p) => a + p.amount, 0));
          setOverdueCount(allPayments.filter(p => p.status === 'overdue').length);
        } catch (e) { console.error(e); }
        finally { if (active) setLoading(false); }
      };
      load();
      return () => { active = false; };
    }, [])
  );

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const calDays = getCalendarDays(viewYear, viewMonth);
  const tKey    = todayKey();

  return (
    <ScrollView
      className="flex-1 bg-light"
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary bar */}
      <View className="bg-primary-dark px-5 pt-5 pb-6">
        <Text className="text-[13px] text-white/60 mb-1 font-semibold tracking-wide uppercase">
          A receber
        </Text>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-[32px] font-bold text-white">{renderPrice(totalPending)}</Text>
        )}
        <View className="flex-row gap-3 mt-3">
          <View className="flex-row items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF8C8C' }} />
            <Text className="text-[12px] text-white font-semibold">{overdueCount} atrasados</Text>
          </View>
          <TouchableOpacity
            className="flex-row items-center gap-1.5 bg-secondary/80 rounded-full px-3 py-1.5"
            onPress={() => navigation.navigate('Rota')}
            activeOpacity={0.8}
          >
            <Feather name="dollar-sign" size={12} color="#0E0F0C" />
            <Text className="text-[12px] text-primary-dark font-bold">Ver Recebimentos</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Calendar
        viewYear={viewYear}
        viewMonth={viewMonth}
        calDays={calDays}
        paymentMap={paymentMap}
        selectedKey={selectedKey}
        todayKey={tKey}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onDayPress={(key) => setSelectedKey(key === selectedKey ? null : key)}
      />

      <PaymentDayView
        selectedKey={selectedKey}
        paymentMap={paymentMap}
        loading={loading}
        onNavigate={() => navigation.navigate('Rota')}
        onSelectKey={(key, year, month) => {
          setSelectedKey(key);
          setViewYear(year);
          setViewMonth(month);
        }}
      />
    </ScrollView>
  );
}
