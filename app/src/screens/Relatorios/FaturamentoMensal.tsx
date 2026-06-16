import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { relatoriosService, FaturamentoMes } from '@/services/relatorios.service';
import { useToast } from '@/components';
import { R$ } from './helpers';
import { PageHeader, EmptyState, Loading } from './ui';
import { colors } from '@/theme/color';

export function FaturamentoMensal({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [data, setData]       = useState<FaturamentoMes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    relatoriosService.getFaturamentoMensal(6)
      .then(setData)
      .catch((e: any) => toast.show(e.message, { type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const maxTotal    = Math.max(...data.map(d => d.total), 1);
  const grandTotal  = data.reduce((a, d) => a + d.total, 0);
  const grandOrders = data.reduce((a, d) => a + d.orders, 0);

  return (
    <KeyboardAvoidingView className="screen" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <PageHeader title="Faturamento mensal" onBack={onBack} />

        <View className="px-5 pb-8">
          {loading ? <Loading /> : (
            <>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 20 }}>
                <View style={{
                  flex: 1, backgroundColor: colors.light.main, borderRadius: 14,
                  padding: 16, alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 11, color: colors.primary.light, fontWeight: '700', marginBottom: 4 }}>
                    TOTAL 6 MESES
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary.dark }}>
                    {R$(grandTotal)}
                  </Text>
                </View>
                <View style={{
                  flex: 1, backgroundColor: colors.light.main, borderRadius: 14,
                  padding: 16, alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 11, color: colors.primary.light, fontWeight: '700', marginBottom: 4 }}>
                    VENDAS
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary.dark }}>
                    {grandOrders}
                  </Text>
                </View>
              </View>

              {[...data].reverse().map(mes => (
                <View key={mes.month_key} style={{
                  backgroundColor: 'white', borderRadius: 14, padding: 14,
                  borderWidth: 1, borderColor: colors.light.dark, marginBottom: 10,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ width: 52, fontSize: 13, fontWeight: '700', color: colors.primary.dark }}>
                      {mes.label}
                    </Text>
                    <View style={{ flex: 1, height: 10, backgroundColor: colors.light.main, borderRadius: 5 }}>
                      <View style={{
                        height: 10, borderRadius: 5, backgroundColor: colors.primary.main,
                        width: `${Math.round((mes.total / maxTotal) * 100)}%`,
                        minWidth: mes.total > 0 ? 6 : 0,
                      }} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: colors.primary.light }}>
                      {mes.orders} venda{mes.orders !== 1 ? 's' : ''}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary.dark }}>
                      {R$(mes.total)}
                    </Text>
                  </View>
                </View>
              ))}

              {data.every(d => d.total === 0) && (
                <EmptyState icon="trending-up" text="Nenhuma venda nos últimos 6 meses." />
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
