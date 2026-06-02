import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  relatoriosService,
  ProdutoRanking, ClienteRanking, FaturamentoMes, VendaAberta,
  PeriodFilter, DueStatus,
} from '@/services/relatorios.service';
import { useToast } from '@/components';

// ── Helpers ───────────────────────────────────────────────────────────────────

const R$ = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString('pt-BR');

const PERIODS: { label: string; value: PeriodFilter }[] = [
  { label: '7 dias',  value: '7d'  },
  { label: '30 dias', value: '30d' },
  { label: '3 meses', value: '90d' },
  { label: 'Tudo',    value: 'all' },
];

const RANK_COLORS: Record<number, { bg: string; badge: string; text: string }> = {
  0: { bg: '#FFF8E6', badge: '#F0C040', text: '#fff' },
  1: { bg: '#F5F5F5', badge: '#C0C0C0', text: '#fff' },
  2: { bg: '#FFF0EB', badge: '#CD7F32', text: '#fff' },
};
const RANK_DEFAULT = { bg: '#F8F5FC', badge: '#D8CCE6', text: '#3C096C' };

const DUE_CONFIG: Record<DueStatus, { label: string; color: string; bg: string }> = {
  overdue: { label: 'Atrasado',     color: '#DF1515', bg: '#FFF0F0' },
  today:   { label: 'Vence hoje',   color: '#B86E00', bg: '#FFF8E6' },
  soon:    { label: 'Esta semana',  color: '#758C36', bg: '#F6FBEA' },
  future:  { label: 'A vencer',     color: '#5A189A', bg: '#EAE3F0' },
};

// ── Componentes compartilhados ────────────────────────────────────────────────

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View className="page-header">
      <TouchableOpacity onPress={onBack} className="mr-3 p-1">
        <Feather name="chevron-left" size={28} color="#3C096C" />
      </TouchableOpacity>
      <Text className="page-title">{title}</Text>
    </View>
  );
}

function PeriodChips({ value, onChange }: { value: PeriodFilter; onChange: (p: PeriodFilter) => void }) {
  return (
    <ScrollView
      horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 8 }}
    >
      {PERIODS.map(p => (
        <TouchableOpacity
          key={p.value}
          onPress={() => onChange(p.value)}
          className={value === p.value ? 'filter-chip-active' : 'filter-chip'}
        >
          <Text className={`text-[12px] font-semibold ${value === p.value ? 'text-white' : 'text-primary'}`}>
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ paddingTop: 60, alignItems: 'center', gap: 10 }}>
      <Feather name={icon as any} size={40} color="#C4B5D0" />
      <Text className="empty-text">{text}</Text>
    </View>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const c = RANK_COLORS[rank] ?? RANK_DEFAULT;
  return (
    <View style={{
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: c.badge,
      alignItems: 'center', justifyContent: 'center', marginRight: 10,
    }}>
      <Text style={{ fontWeight: '800', fontSize: 12, color: c.text }}>{rank + 1}</Text>
    </View>
  );
}

function TopCard({ rank, title, stats }: {
  rank: number;
  title: string;
  stats: { label: string; value: string }[];
}) {
  const c = RANK_COLORS[rank] ?? RANK_DEFAULT;
  return (
    <View style={{
      backgroundColor: c.bg, borderRadius: 16, padding: 20,
      borderWidth: 1.5, borderColor: c.badge, marginBottom: 16,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{
          width: 34, height: 34, borderRadius: 17,
          backgroundColor: c.badge, alignItems: 'center', justifyContent: 'center', marginRight: 10,
        }}>
          <Text style={{ fontWeight: '800', fontSize: 15, color: c.text }}>{rank + 1}</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#3C096C' }} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 24 }}>
        {stats.map(s => (
          <View key={s.label}>
            <Text style={{ fontSize: 11, color: '#8B5A96', fontWeight: '600', marginBottom: 2 }}>{s.label}</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#3C096C' }}>{s.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PropBar({ ratio, color }: { ratio: number; color: string }) {
  return (
    <View style={{ height: 4, backgroundColor: '#EAE3F0', borderRadius: 2, marginBottom: 6, marginTop: 8 }}>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: color, width: `${Math.round(ratio * 100)}%` }} />
    </View>
  );
}

function Loading() {
  return (
    <View style={{ paddingTop: 60, alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#3C096C" />
    </View>
  );
}

// ── Relatório 1: Produto mais vendido ─────────────────────────────────────────

function ProdutoMaisVendido({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [data, setData] = useState<ProdutoRanking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: PeriodFilter) => {
    setLoading(true);
    try { setData(await relatoriosService.getProdutosMaisVendidos(p)); }
    catch (e: any) { toast.show(e.message, { type: 'error' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(period); }, [period]);

  const maxQty = data[0]?.total_qty ?? 1;

  return (
    <KeyboardAvoidingView className="screen" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <PageHeader title="Produto mais vendido" onBack={onBack} />
        <PeriodChips value={period} onChange={p => setPeriod(p)} />
        <View className="px-5 pb-8">
          {loading ? <Loading /> : data.length === 0 ? (
            <EmptyState icon="bar-chart-2" text="Nenhuma venda encontrada neste período." />
          ) : (
            <>
              <TopCard
                rank={0} title={data[0].name}
                stats={[
                  { label: 'UNIDADES', value: String(data[0].total_qty) },
                  { label: 'RECEITA',  value: R$(data[0].total_revenue)  },
                ]}
              />
              {data.slice(1).map((item, i) => {
                const c = RANK_COLORS[i + 1] ?? RANK_DEFAULT;
                return (
                  <View key={item.product_id} style={{
                    backgroundColor: '#fff', borderRadius: 14, padding: 14,
                    borderWidth: 1, borderColor: '#E1DAE8', marginBottom: 10,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <RankBadge rank={i + 1} />
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#3C096C' }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#5A189A' }}>
                        {item.total_qty} un
                      </Text>
                    </View>
                    <PropBar ratio={item.total_qty / maxQty} color={c.badge} />
                    <Text style={{ fontSize: 12, color: '#8B5A96', textAlign: 'right' }}>
                      {R$(item.total_revenue)}
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

// ── Relatório 2: Cliente que mais compra ──────────────────────────────────────

function ClienteMaisCompra({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [data, setData] = useState<ClienteRanking[]>([]);
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

// ── Relatório 3: Faturamento mensal ──────────────────────────────────────────

function FaturamentoMensal({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [data, setData] = useState<FaturamentoMes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    relatoriosService.getFaturamentoMensal(6)
      .then(setData)
      .catch((e: any) => toast.show(e.message, { type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const maxTotal = Math.max(...data.map(d => d.total), 1);
  const grandTotal = data.reduce((a, d) => a + d.total, 0);
  const grandOrders = data.reduce((a, d) => a + d.orders, 0);

  return (
    <KeyboardAvoidingView className="screen" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <PageHeader title="Faturamento mensal" onBack={onBack} />

        <View className="px-5 pb-8">
          {loading ? <Loading /> : (
            <>
              {/* Resumo */}
              <View style={{
                flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 20,
              }}>
                <View style={{
                  flex: 1, backgroundColor: '#EAE3F0', borderRadius: 14,
                  padding: 16, alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 11, color: '#8B5A96', fontWeight: '700', marginBottom: 4 }}>
                    TOTAL 6 MESES
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#3C096C' }}>
                    {R$(grandTotal)}
                  </Text>
                </View>
                <View style={{
                  flex: 1, backgroundColor: '#EAE3F0', borderRadius: 14,
                  padding: 16, alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 11, color: '#8B5A96', fontWeight: '700', marginBottom: 4 }}>
                    VENDAS
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#3C096C' }}>
                    {grandOrders}
                  </Text>
                </View>
              </View>

              {/* Barras por mês */}
              {[...data].reverse().map(mes => (
                <View key={mes.month_key} style={{
                  backgroundColor: '#fff', borderRadius: 14, padding: 14,
                  borderWidth: 1, borderColor: '#E1DAE8', marginBottom: 10,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ width: 52, fontSize: 13, fontWeight: '700', color: '#3C096C' }}>
                      {mes.label}
                    </Text>
                    <View style={{ flex: 1, height: 10, backgroundColor: '#EAE3F0', borderRadius: 5 }}>
                      <View style={{
                        height: 10, borderRadius: 5, backgroundColor: '#5A189A',
                        width: `${Math.round((mes.total / maxTotal) * 100)}%`,
                        minWidth: mes.total > 0 ? 6 : 0,
                      }} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: '#8B5A96' }}>
                      {mes.orders} venda{mes.orders !== 1 ? 's' : ''}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#3C096C' }}>
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

// ── Relatório 4: Vendas em aberto ─────────────────────────────────────────────

function VendasEmAberto({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [data, setData] = useState<VendaAberta[]>([]);
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

  const STATUS_ORDER: DueStatus[] = ['overdue', 'today', 'soon', 'future'];

  return (
    <KeyboardAvoidingView className="screen" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <PageHeader title="Vendas em aberto" onBack={onBack} />

        <View className="px-5 pb-8">
          {loading ? <Loading /> : (
            <>
              {/* Card de total */}
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

              {/* Chips de contagem por status */}
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

// ── Tela índice ───────────────────────────────────────────────────────────────

type ReportStep = 'index' | 'produtos' | 'clientes' | 'faturamento' | 'aberto';

const REPORTS: { step: ReportStep; icon: string; title: string; subtitle: string }[] = [
  { step: 'produtos',    icon: 'bar-chart-2',  title: 'Produto mais vendido',     subtitle: 'Ranking por quantidade e receita'     },
  { step: 'clientes',    icon: 'users',         title: 'Cliente que mais compra',  subtitle: 'Ranking por valor total gasto'        },
  { step: 'faturamento', icon: 'trending-up',   title: 'Faturamento mensal',       subtitle: 'Receita dos últimos 6 meses'          },
  { step: 'aberto',      icon: 'alert-circle',  title: 'Vendas em aberto',         subtitle: 'Pendências, atrasos e a vencer'       },
];

export function Relatorios() {
  const navigation = useNavigation();
  const [step, setStep] = useState<ReportStep>('index');

  if (step === 'produtos')    return <ProdutoMaisVendido    onBack={() => setStep('index')} />;
  if (step === 'clientes')    return <ClienteMaisCompra     onBack={() => setStep('index')} />;
  if (step === 'faturamento') return <FaturamentoMensal     onBack={() => setStep('index')} />;
  if (step === 'aberto')      return <VendasEmAberto        onBack={() => setStep('index')} />;

  return (
    <KeyboardAvoidingView className="screen" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="page-header">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1">
            <Feather name="chevron-left" size={28} color="#3C096C" />
          </TouchableOpacity>
          <Text className="page-title">Relatórios</Text>
        </View>

        <View className="px-5 pt-4 pb-8">
          <Text className="section-title mb-4">Vendas</Text>
          {REPORTS.map(r => (
            <TouchableOpacity
              key={r.step}
              onPress={() => setStep(r.step)}
              style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: '#fff', borderRadius: 14, padding: 16,
                borderWidth: 1, borderColor: '#E1DAE8', marginBottom: 10,
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: '#EAE3F0', alignItems: 'center', justifyContent: 'center',
                marginRight: 14,
              }}>
                <Feather name={r.icon as any} size={22} color="#3C096C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#3C096C' }}>{r.title}</Text>
                <Text style={{ fontSize: 12, color: '#8B5A96', marginTop: 2 }}>{r.subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#8B5A96" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
