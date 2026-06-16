import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { relatoriosService, ProdutoRanking, PeriodFilter } from '@/services/relatorios.service';
import { useToast } from '@/components';
import { R$ } from './helpers';
import { RANK_COLORS, RANK_DEFAULT } from './helpers';
import { PageHeader, PeriodChips, EmptyState, RankBadge, TopCard, PropBar, Loading } from './ui';
import { colors } from '@/theme/color';

type RankMode = 'qty' | 'revenue';

export function ProdutoMaisVendido({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [period, setPeriod]   = useState<PeriodFilter>('30d');
  const [data, setData]       = useState<ProdutoRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankMode, setRankMode] = useState<RankMode>('qty');

  const load = useCallback(async (p: PeriodFilter) => {
    setLoading(true);
    try { setData(await relatoriosService.getProdutosMaisVendidos(p)); }
    catch (e: any) { toast.show(e.message, { type: 'error' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(period); }, [period]);

  const sorted = [...data].sort((a, b) => {
    const primary = rankMode === 'qty'
      ? b.total_qty - a.total_qty
      : b.total_revenue - a.total_revenue;
    if (primary !== 0) return primary;
    return rankMode === 'qty'
      ? b.total_revenue - a.total_revenue
      : b.total_qty - a.total_qty;
  });

  const maxPrimary = rankMode === 'qty'
    ? (sorted[0]?.total_qty ?? 1)
    : (sorted[0]?.total_revenue ?? 1);

  return (
    <KeyboardAvoidingView className="screen" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <PageHeader title="Produto mais vendido" onBack={onBack} />
        <PeriodChips value={period} onChange={p => setPeriod(p)} />

        <View style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: colors.light.main, borderRadius: 12, padding: 4 }}>
          <TouchableOpacity
            onPress={() => setRankMode('qty')}
            style={{
              flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center',
              backgroundColor: rankMode === 'qty' ? colors.primary.dark : 'transparent',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: rankMode === 'qty' ? 'white' : colors.primary.main }}>
              Unidades
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRankMode('revenue')}
            style={{
              flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center',
              backgroundColor: rankMode === 'revenue' ? colors.primary.dark : 'transparent',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: rankMode === 'revenue' ? 'white' : colors.primary.main }}>
              Valor (R$)
            </Text>
          </TouchableOpacity>
        </View>

        <View className="px-5 pb-8">
          {loading ? <Loading /> : sorted.length === 0 ? (
            <EmptyState icon="bar-chart-2" text="Nenhuma venda encontrada neste período." />
          ) : (
            <>
              <TopCard
                rank={0} title={sorted[0].name}
                stats={[
                  { label: 'UNIDADES', value: String(sorted[0].total_qty) },
                  { label: 'RECEITA',  value: R$(sorted[0].total_revenue)  },
                ]}
              />
              {sorted.slice(1).map((item, i) => {
                const c = RANK_COLORS[i + 1] ?? RANK_DEFAULT;
                const primaryVal = rankMode === 'qty' ? item.total_qty : item.total_revenue;
                const secondaryLabel = rankMode === 'qty' ? R$(item.total_revenue) : `${item.total_qty} un`;
                return (
                  <View key={item.product_id} style={{
                    backgroundColor: 'white', borderRadius: 14, padding: 14,
                    borderWidth: 1, borderColor: colors.light.dark, marginBottom: 10,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <RankBadge rank={i + 1} />
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.primary.dark }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary.main }}>
                        {rankMode === 'qty' ? `${item.total_qty} un` : R$(item.total_revenue)}
                      </Text>
                    </View>
                    <PropBar ratio={primaryVal / maxPrimary} color={c.badge} />
                    <Text style={{ fontSize: 12, color: colors.primary.light, textAlign: 'right' }}>
                      {secondaryLabel}
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
