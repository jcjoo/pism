import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CalendarPayment } from './types';
import { renderPrice, STATUS_COLOR, STATUS_LABEL, MONTH_NAMES, todayKey } from './helpers';

interface PaymentDayViewProps {
  selectedKey:  string | null;
  paymentMap:   Record<string, CalendarPayment[]>;
  loading:      boolean;
  onNavigate:   () => void;
  onSelectKey:  (key: string, year: number, month: number) => void;
}

export function PaymentDayView({ selectedKey, paymentMap, loading, onNavigate, onSelectKey }: PaymentDayViewProps) {
  const tKey        = todayKey();
  const selPayments = selectedKey ? (paymentMap[selectedKey] ?? []) : [];

  return (
    <>
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
              <TouchableOpacity onPress={onNavigate} activeOpacity={0.8}>
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
                  onPress={onNavigate}
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
                onPress={onNavigate}
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

      {/* Upcoming section (when nothing selected or no payments for selected day) */}
      {(!selectedKey || selPayments.length === 0) && !loading && (
        <View className="mx-4 mt-3">
          <Text className="text-[13px] font-bold text-primary-dark mb-2">Próximos vencimentos</Text>
          {(() => {
            const upcoming = Object.entries(paymentMap)
              .filter(([k]) => k >= tKey)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(0, 5)
              .flatMap(([key, payments]) => payments.map(p => ({ ...p, key })))
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
                onPress={() => onSelectKey(p.key, parseInt(p.key.slice(0, 4)), parseInt(p.key.slice(5, 7)) - 1)}
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
    </>
  );
}
