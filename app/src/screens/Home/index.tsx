import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { recebimentosService, PendingSale, SaleInstallment } from '@/services/recebimentos.service';

// ── Types ─────────────────────────────────────────────────────────────────────

type DueStatus = 'overdue' | 'today' | 'future';

interface CalendarPayment {
  saleId: string;
  clientName: string;
  amount: number;
  status: DueStatus;
  installmentNumber?: number;
  installmentTotal?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const renderPrice = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

const toDateKey = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const todayKey = () => toDateKey(new Date());

const getDayStatus = (dateKey: string): DueStatus => {
  const today = todayKey();
  if (dateKey < today) return 'overdue';
  if (dateKey === today) return 'today';
  return 'future';
};

const STATUS_COLOR: Record<DueStatus, string> = {
  overdue: '#DF1515',
  today:   '#FF8C00',
  future:  '#5A189A',
};

const STATUS_LABEL: Record<DueStatus, string> = {
  overdue: 'Atrasado',
  today:   'Vence hoje',
  future:  'A vencer',
};

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DOW_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function buildPaymentMap(sales: PendingSale[]): Record<string, CalendarPayment[]> {
  const map: Record<string, CalendarPayment[]> = {};

  const add = (key: string, p: CalendarPayment) => {
    if (!map[key]) map[key] = [];
    map[key].push(p);
  };

  for (const sale of sales) {
    const clientName = sale.clients?.name ?? 'Cliente';

    if (sale.payment === 'cash') {
      const key = toDateKey(sale.dueDate);
      add(key, {
        saleId: clientName,
        clientName,
        amount: sale.sale_items.reduce((a, i) => a + i.price * i.quantity, 0),
        status: getDayStatus(key),
      });
    } else {
      const totalInstallments = sale.installments ?? 1;
      for (const inst of sale.sale_installments ?? []) {
        if (inst.received_at) continue;
        const key = toDateKey(inst.due_date);
        add(key, {
          saleId: sale.id + '-' + inst.id,
          clientName,
          amount: inst.amount,
          status: getDayStatus(key),
          installmentNumber: inst.installment_number,
          installmentTotal: totalInstallments,
        });
      }
    }
  }

  return map;
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

// ── PaymentDots ───────────────────────────────────────────────────────────────

function PaymentDots({ payments }: { payments: CalendarPayment[] }) {
  const dots = payments.slice(0, 3);
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
        <Text style={{ fontSize: 7, color: '#5A189A', fontWeight: 'bold', lineHeight: 6 }}>+{extra}</Text>
      )}
    </View>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────

export function Home() {
  const navigation = useNavigation<any>();

  const [loading, setLoading]         = useState(true);
  const [paymentMap, setPaymentMap]   = useState<Record<string, CalendarPayment[]>>({});
  const [totalPending, setTotalPending] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
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
        } catch (e) {
          console.error(e);
        } finally {
          if (active) setLoading(false);
        }
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

  const calDays   = getCalendarDays(viewYear, viewMonth);
  const tKey      = todayKey();
  const selPayments = selectedKey ? (paymentMap[selectedKey] ?? []) : [];

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

      {/* Calendar card */}
      <View className="mx-4 -mt-3 bg-white rounded-[16px] elevation-3 overflow-hidden">
        {/* Month navigation */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-light-dark">
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-left" size={22} color="#3C096C" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-primary-dark">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-right" size={22} color="#3C096C" />
          </TouchableOpacity>
        </View>

        {/* Day-of-week header */}
        <View className="flex-row px-2 pt-3 pb-1">
          {DOW_LABELS.map((d, i) => (
            <View key={i} className="flex-1 items-center">
              <Text style={{ fontSize: 11, fontWeight: '700', color: i === 0 ? '#DF1515' : '#8B5A96' }}>
                {d}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View className="px-2 pb-3">
          {Array.from({ length: calDays.length / 7 }).map((_, week) => (
            <View key={week} className="flex-row">
              {calDays.slice(week * 7, week * 7 + 7).map((day, col) => {
                if (!day) return <View key={col} className="flex-1 m-[2px] h-[52px]" />;

                const key       = toDateKey(day);
                const isToday   = key === tKey;
                const isSelected = key === selectedKey;
                const payments  = paymentMap[key] ?? [];
                const hasPayments = payments.length > 0;
                const isSunday  = col === 0;

                return (
                  <TouchableOpacity
                    key={col}
                    className="flex-1 m-[2px] h-[52px] items-center justify-start pt-1.5 rounded-[10px]"
                    style={[
                      isSelected
                        ? { backgroundColor: '#3C096C' }
                        : isToday
                        ? { backgroundColor: '#E1DAE8' }
                        : undefined,
                    ]}
                    onPress={() => setSelectedKey(key === selectedKey ? null : key)}
                    activeOpacity={0.7}
                  >
                    <Text style={{
                      fontSize: 13,
                      fontWeight: isToday || isSelected ? '800' : '500',
                      color: isSelected
                        ? '#fff'
                        : isToday
                        ? '#3C096C'
                        : isSunday
                        ? '#DF1515'
                        : '#2D1B4E',
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
              <Text style={{ fontSize: 10, color: '#8B5A96', fontWeight: '600' }}>{STATUS_LABEL[s]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Selected day payments */}
      {selectedKey && (
        <View className="mx-4 mt-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-[13px] font-bold text-primary-dark">
              {selPayments.length > 0
                ? `${selPayments.length} vencimento${selPayments.length > 1 ? 's' : ''} em ${new Date(selectedKey + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`
                : `Sem vencimentos em ${new Date(selectedKey + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`}
            </Text>
            {selPayments.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Rota')} activeOpacity={0.8}>
                <Text className="text-[11px] font-bold text-primary underline">Ver todos</Text>
              </TouchableOpacity>
            )}
          </View>

          {selPayments.length === 0 ? (
            <View className="bg-white rounded-[12px] p-5 items-center elevation-1">
              <Feather name="check-circle" size={32} color="#8B5A96" />
              <Text className="text-[13px] text-primary mt-2">Nenhum pagamento neste dia</Text>
            </View>
          ) : (
            <>
              {selPayments.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  className="bg-white rounded-[12px] p-4 mb-2 elevation-1 flex-row items-center"
                  style={{ borderLeftWidth: 4, borderLeftColor: STATUS_COLOR[p.status] }}
                  onPress={() => navigation.navigate('Rota')}
                  activeOpacity={0.8}
                >
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-primary-dark" numberOfLines={1}>
                      {p.clientName}
                    </Text>
                    {p.installmentNumber != null && (
                      <Text className="text-[11px] text-primary mt-0.5">
                        Parcela {p.installmentNumber}/{p.installmentTotal}
                      </Text>
                    )}
                    <View className="flex-row items-center gap-1.5 mt-1">
                      <View className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[p.status] + '22' }}>
                        <Text style={{ fontSize: 10, color: STATUS_COLOR[p.status], fontWeight: '700' }}>
                          {STATUS_LABEL[p.status]}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View className="items-end ml-3">
                    <Text className="text-[15px] font-bold text-primary-dark">{renderPrice(p.amount)}</Text>
                    <Feather name="chevron-right" size={16} color="#8B5A96" style={{ marginTop: 4 }} />
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                className="bg-primary-dark rounded-[12px] p-4 mt-1 flex-row items-center justify-center gap-2"
                onPress={() => navigation.navigate('Rota')}
                activeOpacity={0.85}
              >
                <Feather name="dollar-sign" size={16} color="#C4D680" />
                <Text className="text-[13px] font-bold text-white">Ir para Recebimentos</Text>
                <Feather name="arrow-right" size={14} color="#C4D680" />
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Upcoming this week (if nothing selected or selected has no payments) */}
      {(!selectedKey || selPayments.length === 0) && !loading && (
        <View className="mx-4 mt-3">
          <Text className="text-[13px] font-bold text-primary-dark mb-2">Próximos vencimentos</Text>
          {(() => {
            const upcoming = Object.entries(paymentMap)
              .filter(([k]) => k >= tKey)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(0, 5)
              .flatMap(([key, payments]) =>
                payments.map(p => ({ ...p, key }))
              )
              .slice(0, 5);

            if (upcoming.length === 0) return (
              <View className="bg-white rounded-[12px] p-5 items-center elevation-1">
                <Feather name="check-circle" size={32} color="#758C36" />
                <Text className="text-[13px] text-primary mt-2">Todos os pagamentos em dia!</Text>
              </View>
            );

            return upcoming.map((p, i) => (
              <TouchableOpacity
                key={i}
                className="bg-white rounded-[12px] p-3.5 mb-2 elevation-1 flex-row items-center"
                style={{ borderLeftWidth: 3, borderLeftColor: STATUS_COLOR[p.status] }}
                onPress={() => { setSelectedKey(p.key); setViewYear(parseInt(p.key.slice(0, 4))); setViewMonth(parseInt(p.key.slice(5, 7)) - 1); }}
                activeOpacity={0.8}
              >
                <View className="w-10 h-10 rounded-[8px] items-center justify-center mr-3"
                  style={{ backgroundColor: STATUS_COLOR[p.status] + '18' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: STATUS_COLOR[p.status] }}>
                    {parseInt(p.key.slice(8, 10))}
                  </Text>
                  <Text style={{ fontSize: 9, color: STATUS_COLOR[p.status], fontWeight: '600' }}>
                    {MONTH_NAMES[parseInt(p.key.slice(5, 7)) - 1].slice(0, 3).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-bold text-primary-dark" numberOfLines={1}>
                    {p.clientName}
                  </Text>
                  {p.installmentNumber != null && (
                    <Text className="text-[10px] text-primary">Parcela {p.installmentNumber}/{p.installmentTotal}</Text>
                  )}
                </View>
                <Text className="text-[14px] font-bold text-primary-dark">{renderPrice(p.amount)}</Text>
              </TouchableOpacity>
            ));
          })()}
        </View>
      )}
    </ScrollView>
  );
}
