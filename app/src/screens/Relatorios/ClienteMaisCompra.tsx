import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { relatoriosService, ClienteRanking, PeriodFilter } from '@/services/relatorios.service';
import { useToast } from '@/components';
import { R$ } from './helpers';
import { RANK_COLORS, RANK_DEFAULT } from './helpers';
import { PageHeader, PeriodChips, EmptyState, RankBadge, TopCard, PropBar, Loading } from './ui';

export function ClienteMaisCompra({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [period, setPeriod]   = useState<PeriodFilter>('30d');
  const [data, setData]       = useState<ClienteRanking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: PeriodFilter) => {
    setLoading(true);
    try { setData(await relatoriosService.getClientesMaisCompradores(p)); }
    catch (e: any) { toast.show(e.message, { type: 'error' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(period); }, [period]);

  const maxSpent = data[0]?.total_spent ?? 1;

  return (
    <KeyboardAvoidingView className="screen" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <PageHeader title="Cliente que mais compra" onBack={onBack} />
        <PeriodChips value={period} onChange={p => setPeriod(p)} />
        <View className="px-5 pb-8">
          {loading ? <Loading /> : data.length === 0 ? (
            <EmptyState icon="users" text="Nenhuma venda encontrada neste período." />
          ) : (
            <>
              <TopCard
                rank={0} title={data[0].name}
                stats={[
                  { label: 'PEDIDOS', value: String(data[0].total_orders) },
                  { label: 'TOTAL',   value: R$(data[0].total_spent)      },
                ]}
              />
              {data.slice(1).map((item, i) => {
                const c = RANK_COLORS[i + 1] ?? RANK_DEFAULT;
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
                    <PropBar ratio={item.total_spent / maxSpent} color={c.badge} />
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
