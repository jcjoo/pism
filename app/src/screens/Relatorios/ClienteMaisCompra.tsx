import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { relatoriosService, ClienteRanking, PeriodFilter } from '@/services/relatorios.service';
import { useToast } from '@/components';
import { R$ } from './helpers';
import { RANK_COLORS, RANK_DEFAULT } from './helpers';
import { PageHeader, PeriodChips, EmptyState, RankBadge, TopCard, PropBar, Loading } from './ui';

type RankMode = 'orders' | 'spent';

export function ClienteMaisCompra({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [period, setPeriod]   = useState<PeriodFilter>('30d');
  const [data, setData]       = useState<ClienteRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankMode, setRankMode] = useState<RankMode>('spent');

  const load = useCallback(async (p: PeriodFilter) => {
    setLoading(true);
    try { setData(await relatoriosService.getClientesMaisCompradores(p)); }
    catch (e: any) { toast.show(e.message, { type: 'error' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(period); }, [period]);

  const sorted = [...data].sort((a, b) => {
    const primary = rankMode === 'orders'
      ? b.total_orders - a.total_orders
      : b.total_spent - a.total_spent;
    if (primary !== 0) return primary;
    return rankMode === 'orders'
      ? b.total_spent - a.total_spent
      : b.total_orders - a.total_orders;
  });

  const maxSpent = rankMode === 'orders'
    ? (sorted[0]?.total_orders ?? 1)
    : (sorted[0]?.total_spent ?? 1);

  return (
    <KeyboardAvoidingView className="screen" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <PageHeader title="Cliente que mais compra" onBack={onBack} />
        <PeriodChips value={period} onChange={p => setPeriod(p)} />

        <View style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: '#EAE3F0', borderRadius: 12, padding: 4 }}>
          <TouchableOpacity
            onPress={() => setRankMode('orders')}
            style={{
              flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center',
              backgroundColor: rankMode === 'orders' ? '#3C096C' : 'transparent',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: rankMode === 'orders' ? '#fff' : '#5A189A' }}>
              Qtd. de vendas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRankMode('spent')}
            style={{
              flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center',
              backgroundColor: rankMode === 'spent' ? '#3C096C' : 'transparent',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: rankMode === 'spent' ? '#fff' : '#5A189A' }}>
              Valor (R$)
            </Text>
          </TouchableOpacity>
        </View>

        <View className="px-5 pb-8">
          {loading ? <Loading /> : sorted.length === 0 ? (
            <EmptyState icon="users" text="Nenhuma venda encontrada neste período." />
          ) : (
            <>
              <TopCard
                rank={0} title={sorted[0].name}
                stats={[
                  { label: 'PEDIDOS', value: String(sorted[0].total_orders) },
                  { label: 'TOTAL',   value: R$(sorted[0].total_spent)      },
                ]}
              />
              {sorted.slice(1).map((item, i) => {
                const c = RANK_COLORS[i + 1] ?? RANK_DEFAULT;
                const primaryVal = rankMode === 'orders' ? item.total_orders : item.total_spent;
                return (
                  <View key={item.client_id} style={{
                    backgroundColor: '#fff', borderRadius: 14, padding: 14,
                    borderWidth: 1, borderColor: '#E1DAE8', marginBottom: 10,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <RankBadge rank={i + 1} />
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#3C096C' }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#8B5A96' }}>
                        {item.total_orders} pedido{item.total_orders !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <PropBar ratio={primaryVal / maxSpent} color={c.badge} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#5A189A', textAlign: 'right' }}>
                      {R$(item.total_spent)}
                    </Text>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
