import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { relatoriosService, VendaAberta, DueStatus } from '@/services/relatorios.service';
import { useToast } from '@/components';
import { R$, fmtDate, DUE_CONFIG } from './helpers';
import { PageHeader, EmptyState, Loading } from './ui';

const STATUS_ORDER: DueStatus[] = ['overdue', 'today', 'soon', 'future'];

export function VendasEmAberto({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [data, setData]       = useState<VendaAberta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    relatoriosService.getVendasEmAberto()
      .then(setData)
      .catch((e: any) => toast.show(e.message, { type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const total = data.reduce((a, v) => a + v.total, 0);
  const counts: Record<DueStatus, number> = { overdue: 0, today: 0, soon: 0, future: 0 };
  data.forEach(v => counts[v.status]++);

  return (
    <KeyboardAvoidingView className="screen" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <PageHeader title="Vendas em aberto" onBack={onBack} />

        <View className="px-5 pb-8">
          {loading ? <Loading /> : (
            <>
              <View style={{
                backgroundColor: '#3C096C', borderRadius: 16, padding: 20,
                marginTop: 8, marginBottom: 16,
              }}>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginBottom: 4 }}>
                  TOTAL EM ABERTO
                </Text>
                <Text style={{ fontSize: 30, fontWeight: '800', color: '#fff' }}>{R$(total)}</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                  {data.length} venda{data.length !== 1 ? 's' : ''}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {STATUS_ORDER.filter(s => counts[s] > 0).map(s => {
                  const cfg = DUE_CONFIG[s];
                  return (
                    <View key={s} style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: cfg.bg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
                    }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cfg.color }} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: cfg.color }}>
                        {counts[s]} {cfg.label.toLowerCase()}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {data.length === 0 ? (
                <EmptyState icon="check-circle" text="Nenhuma venda em aberto." />
              ) : (
                STATUS_ORDER.map(status => {
                  const group = data.filter(v => v.status === status);
                  if (group.length === 0) return null;
                  const cfg = DUE_CONFIG[status];
                  return (
                    <View key={status} style={{ marginBottom: 16 }}>
                      <Text style={{
                        fontSize: 11, fontWeight: '700', color: cfg.color,
                        letterSpacing: 0.8, marginBottom: 8,
                      }}>
                        {cfg.label.toUpperCase()} ({group.length})
                      </Text>
                      {group.map(venda => (
                        <View key={venda.id} style={{
                          backgroundColor: '#fff', borderRadius: 12, padding: 14,
                          borderWidth: 1, borderLeftWidth: 3,
                          borderColor: '#E1DAE8', borderLeftColor: cfg.color,
                          marginBottom: 8,
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#3C096C' }} numberOfLines={1}>
                              {venda.client_name}
                            </Text>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: cfg.color }}>
                              {R$(venda.total)}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 12, color: '#8B5A96', marginTop: 4 }}>
                            Vence em {fmtDate(venda.due_date)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
