import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Linking,
  RefreshControl,
  FlatList,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button } from '@/components';
import { colors } from '@/theme';
import { recebimentosService, PendingSale } from '@/services/recebimentos.service';

// ── Helpers ─────────────────────────────────────────────────────────────────

type DueStatus = 'overdue' | 'today' | 'week' | 'future';

const saleTotal = (sale: PendingSale) =>
  sale.sale_items.reduce((acc, item) => acc + item.price * item.quantity, 0);

const renderPrice = (val: number) =>
  `R$ ${val.toFixed(2).replace('.', ',')}`;

const formatDate = (d: string | Date | null) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR');
};

const getDaysUntilDue = (dueDate: string, ref: Date = new Date()) => {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const base = new Date(ref);
  base.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
};

const getStatus = (dueDate: string, ref?: Date): DueStatus => {
  const days = getDaysUntilDue(dueDate, ref);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 7) return 'week';
  return 'future';
};

const STATUS = {
  overdue: { label: 'Atrasado', color: colors.danger.main },
  today:   { label: 'Vence hoje', color: '#FF8C00' },
  week:    { label: 'Esta semana', color: colors.secondary.dark },
  future:  { label: 'Em dia', color: colors.primary.main },
};

// ── Recebimento Manual ───────────────────────────────────────────────────────

type ManualFilter = 'all' | 'overdue' | 'today' | 'week';

function RecebimentoManual() {
  const [sales, setSales] = useState<PendingSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ManualFilter>('all');
  const [selected, setSelected] = useState<PendingSale | null>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setSales(await recebimentosService.getPending());
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = sales
    .filter(s => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        s.clients?.name.toLowerCase().includes(q) ||
        s.clients?.address?.toLowerCase().includes(q) ||
        s.clients?.municipio?.nome.toLowerCase().includes(q);

      const st = getStatus(s.dueDate);
      const matchFilter =
        filter === 'all' ||
        (filter === 'overdue' && st === 'overdue') ||
        (filter === 'today'   && st === 'today') ||
        (filter === 'week'    && (st === 'today' || st === 'week'));

      return matchSearch && matchFilter;
    })
    .sort((a, b) => getDaysUntilDue(a.dueDate) - getDaysUntilDue(b.dueDate));

  const totalPending  = sales.reduce((acc, s) => acc + saleTotal(s), 0);
  const overdueCount  = sales.filter(s => getStatus(s.dueDate) === 'overdue').length;

  const openModal = (sale: PendingSale) => {
    setSelected(sale);
    setAmount(saleTotal(sale).toFixed(2).replace('.', ','));
  };

  const confirm = async () => {
    if (!selected) return;
    const num = parseFloat(amount.replace(',', '.'));
    if (isNaN(num) || num <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor válido.');
      return;
    }
    setSaving(true);
    try {
      await recebimentosService.markReceived(selected.id, num);
      setSales(prev => prev.filter(s => s.id !== selected.id));
      setSelected(null);
      Alert.alert('Recebimento confirmado!', renderPrice(num) + ' registrado.');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSaving(false);
    }
  };

  const Chip = ({ label, val }: { label: string; val: ManualFilter }) => (
    <TouchableOpacity
      style={[s.chip, filter === val && s.chipOn]}
      onPress={() => setFilter(val)}
    >
      <Text style={[s.chipTxt, filter === val && s.chipTxtOn]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Summary bar */}
      <View style={s.summaryBar}>
        <View>
          <Text style={s.sumLabel}>{sales.length} em aberto</Text>
          <Text style={s.sumValue}>{renderPrice(totalPending)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.sumLabel}>Atrasados</Text>
          <Text style={[s.sumValue, { color: '#FF8C8C' }]}>{overdueCount}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Feather name="search" size={16} color={colors.primary.main} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar cliente ou cidade..."
          placeholderTextColor={colors.primary.light}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={16} color={colors.primary.main} />
          </TouchableOpacity>
        )}
      </View>

      {/* Chips */}
      <View style={s.chipRow}>
        <Chip label="Todos" val="all" />
        <Chip label="Atrasados" val="overdue" />
        <Chip label="Hoje" val="today" />
        <Chip label="Esta semana" val="week" />
      </View>

      {loading ? (
        <View style={s.empty}>
          <Text style={s.emptyTxt}>Carregando...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              colors={[colors.primary.dark]}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="check-circle" size={52} color={colors.primary.light} />
              <Text style={s.emptyTxt}>Nenhum recebimento encontrado</Text>
              <Text style={{ fontSize: 12, color: colors.primary.light, marginTop: 4 }}>
                Puxe para atualizar
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const st = getStatus(item.dueDate);
            const cfg = STATUS[st];
            const days = getDaysUntilDue(item.dueDate);
            const total = saleTotal(item);
            const city = item.clients?.municipio?.nome;

            return (
              <TouchableOpacity
                style={[s.card, { borderLeftColor: cfg.color }]}
                onPress={() => openModal(item)}
                activeOpacity={0.75}
              >
                <View style={s.cardRow}>
                  <Text style={s.cardName} numberOfLines={1}>
                    {item.clients?.name || 'Cliente removido'}
                  </Text>
                  <Text style={s.cardTotal}>{renderPrice(total)}</Text>
                </View>

                <View style={s.cardRow}>
                  <Text style={s.cardAddr} numberOfLines={1}>
                    {city ? `${city} · ` : ''}{item.clients?.address}
                  </Text>
                  <View style={[s.badge, { backgroundColor: cfg.color }]}>
                    <Text style={s.badgeTxt}>
                      {days < 0
                        ? `${Math.abs(days)}d atraso`
                        : days === 0
                        ? 'Hoje'
                        : `${days}d`}
                    </Text>
                  </View>
                </View>

                <View style={s.cardRow}>
                  <Text style={s.cardDue}>Vence: {formatDate(item.dueDate)}</Text>
                  <Text style={s.cardItems}>
                    {item.sale_items.length} {item.sale_items.length === 1 ? 'item' : 'itens'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Receipt modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <TouchableOpacity activeOpacity={1} style={s.sheet}>
            {selected && (() => {
              const st = getStatus(selected.dueDate);
              const cfg = STATUS[st];
              return (
                <>
                  <View style={[s.sheetHead, { borderTopColor: cfg.color }]}>
                    <Text style={s.sheetTitle}>{selected.clients?.name}</Text>
                    <Text style={s.sheetSub}>{selected.clients?.address}</Text>
                    {selected.clients?.municipio && (
                      <Text style={s.sheetSub}>
                        {selected.clients.municipio.nome} – {selected.clients.municipio.uf}
                      </Text>
                    )}
                    <View style={[s.badge, { backgroundColor: cfg.color, alignSelf: 'flex-start', marginTop: 8 }]}>
                      <Text style={s.badgeTxt}>{cfg.label}</Text>
                    </View>
                  </View>

                  <View style={s.itemList}>
                    {selected.sale_items.map((item, i) => (
                      <View key={i} style={s.itemRow}>
                        <Text style={s.itemTxt}>{item.quantity}x {item.products?.name}</Text>
                        <Text style={s.itemPrice}>{renderPrice(item.price * item.quantity)}</Text>
                      </View>
                    ))}
                    <View style={[s.itemRow, { borderBottomWidth: 0, marginTop: 6 }]}>
                      <Text style={[s.itemTxt, { fontWeight: 'bold', fontSize: 15 }]}>Total</Text>
                      <Text style={[s.itemPrice, { color: colors.secondary.dark, fontSize: 15 }]}>
                        {renderPrice(saleTotal(selected))}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.sheetLabel}>Valor Recebido (R$)</Text>
                  <TextInput
                    style={s.amountInput}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />

                  <View style={{ flexDirection: 'row' }}>
                    <Button
                      title="Cancelar"
                      variant="primary-dark"
                      style={{ flex: 1, marginRight: 6 }}
                      onPress={() => setSelected(null)}
                    />
                    <Button
                      title={saving ? 'Salvando...' : 'Confirmar Recebimento'}
                      variant="secondary"
                      style={{ flex: 1.5 }}
                      onPress={confirm}
                      disabled={saving}
                    />
                  </View>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Rota de Recebimento ──────────────────────────────────────────────────────

interface RouteStop {
  sale: PendingSale;
  order: number;
  status: DueStatus;
  days: number;
  total: number;
  city: string;
}

const priorityOf = (stop: RouteStop) => {
  if (stop.status === 'overdue') return -1000 + stop.days;
  if (stop.status === 'today')   return 0;
  if (stop.status === 'week')    return stop.days;
  return 100 + stop.days;
};

function buildRoute(
  sales: PendingSale[],
  workHours: number,
  avgStopMins: number,
  targetDate: Date,
): { route: RouteStop[]; excluded: RouteStop[] } {
  const maxStops = Math.max(1, Math.floor((workHours * 60) / avgStopMins));

  const scored: RouteStop[] = sales.map(sale => {
    const days = getDaysUntilDue(sale.dueDate, targetDate);
    const status = getStatus(sale.dueDate, targetDate);
    // Use city name first, fall back to first part of address
    const city =
      sale.clients?.municipio?.nome ||
      sale.clients?.address?.split(',')[0]?.trim() ||
      'Sem cidade';
    return { sale, order: 0, status, days, total: saleTotal(sale), city };
  });

  const pool = [...scored].sort((a, b) => priorityOf(a) - priorityOf(b));
  const route: RouteStop[] = [];

  while (pool.length > 0 && route.length < maxStops) {
    const lastCity = route.length > 0 ? route[route.length - 1].city : null;
    let pick = 0;

    if (lastCity) {
      // Among the next 6 candidates, prefer same city (avoids going too far down)
      const sameIdx = pool.slice(0, 6).findIndex(s => s.city === lastCity);
      if (sameIdx >= 0) pick = sameIdx;
    }

    route.push({ ...pool[pick], order: route.length + 1 });
    pool.splice(pick, 1);
  }

  const excluded = pool.map((s, i) => ({ ...s, order: route.length + i + 1 }));
  return { route, excluded };
}

function RotaRecebimento() {
  const [workHours, setWorkHours] = useState('8');
  const [avgStop,   setAvgStop]   = useState('15');
  const [targetDate, setTargetDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [route,    setRoute]    = useState<RouteStop[]>([]);
  const [excluded, setExcluded] = useState<RouteStop[]>([]);
  const [generated, setGenerated] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);

  const generate = async () => {
    const hours   = parseFloat(workHours.replace(',', '.'));
    const minStop = parseFloat(avgStop.replace(',', '.'));

    if (isNaN(hours) || hours <= 0 || isNaN(minStop) || minStop <= 0) {
      Alert.alert('Parâmetros inválidos', 'Preencha horas e tempo por parada corretamente.');
      return;
    }

    setLoading(true);
    try {
      const sales = await recebimentosService.getPending();
      const { route: r, excluded: ex } = buildRoute(sales, hours, minStop, targetDate);
      setRoute(r);
      setExcluded(ex);
      setGenerated(true);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  };

  const openMaps = (stop: RouteStop) => {
    const addr = encodeURIComponent(
      [stop.sale.clients?.address, stop.city].filter(Boolean).join(', ')
    );
    Linking.openURL(`https://maps.google.com/maps?q=${addr}`);
  };

  const totalRoute   = route.reduce((acc, s) => acc + s.total, 0);
  const estMins      = route.length * parseFloat(avgStop || '0');
  const estH         = Math.floor(estMins / 60);
  const estMin       = Math.round(estMins % 60);

  const StopCard = ({ stop, dim }: { stop: RouteStop; dim?: boolean }) => {
    const cfg  = STATUS[stop.status];
    const days = stop.days;
    return (
      <View style={[r.stopCard, dim && { opacity: 0.45 }]}>
        <View style={[r.marker, { backgroundColor: cfg.color }]}>
          <Text style={r.markerNum}>{stop.order}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={r.stopRow}>
            <Text style={r.stopName} numberOfLines={1}>{stop.sale.clients?.name}</Text>
            <Text style={r.stopTotal}>{renderPrice(stop.total)}</Text>
          </View>
          <Text style={r.stopAddr} numberOfLines={1}>
            {stop.city} · {stop.sale.clients?.address}
          </Text>
          <View style={r.stopRow}>
            <View style={[s.badge, { backgroundColor: cfg.color }]}>
              <Text style={s.badgeTxt}>
                {days < 0
                  ? `${Math.abs(days)}d atraso`
                  : days === 0
                  ? 'Hoje'
                  : `Vence em ${days}d`}
              </Text>
            </View>
            {!dim && (
              <TouchableOpacity style={r.navBtn} onPress={() => openMaps(stop)}>
                <Feather name="navigation" size={11} color="#fff" />
                <Text style={r.navTxt}> Navegar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Config card */}
      <View style={r.configCard}>
        <Text style={r.configTitle}>Parâmetros da Rota</Text>

        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={r.configLabel}>Horas disponíveis</Text>
            <TextInput
              style={r.configInput}
              value={workHours}
              onChangeText={setWorkHours}
              keyboardType="decimal-pad"
              placeholder="8"
              placeholderTextColor={colors.primary.light}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={r.configLabel}>Min. por parada</Text>
            <TextInput
              style={r.configInput}
              value={avgStop}
              onChangeText={setAvgStop}
              keyboardType="decimal-pad"
              placeholder="15"
              placeholderTextColor={colors.primary.light}
            />
          </View>
        </View>

        <Text style={r.configLabel}>Data da rota</Text>
        <TouchableOpacity style={r.datePick} onPress={() => setShowPicker(true)}>
          <Feather name="calendar" size={16} color={colors.primary.dark} />
          <Text style={r.datePickTxt}>
            {targetDate.toLocaleDateString('pt-BR', {
              weekday: 'long', day: '2-digit', month: 'long',
            })}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={targetDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => {
              setShowPicker(false);
              if (date) setTargetDate(date);
            }}
          />
        )}

        <Button
          title={loading ? 'Gerando rota...' : 'Gerar Rota'}
          variant="secondary"
          disabled={loading}
          onPress={generate}
          icon={<Feather name="map-pin" size={16} color={colors.dark.main} />}
        />
      </View>

      {generated && (
        <View style={{ paddingHorizontal: 16 }}>
          {/* Summary */}
          <View style={r.summary}>
            <View style={r.sumItem}>
              <Feather name="map-pin" size={18} color={colors.primary.dark} />
              <Text style={r.sumVal}>{route.length}</Text>
              <Text style={r.sumLbl}>paradas</Text>
            </View>
            <View style={r.sumDiv} />
            <View style={r.sumItem}>
              <Feather name="dollar-sign" size={18} color={colors.secondary.dark} />
              <Text style={r.sumVal}>{renderPrice(totalRoute)}</Text>
              <Text style={r.sumLbl}>a receber</Text>
            </View>
            <View style={r.sumDiv} />
            <View style={r.sumItem}>
              <Feather name="clock" size={18} color={colors.primary.main} />
              <Text style={r.sumVal}>
                {estH > 0 ? `${estH}h ` : ''}{estMin > 0 ? `${estMin}min` : '—'}
              </Text>
              <Text style={r.sumLbl}>estimado</Text>
            </View>
          </View>

          {route.length === 0 ? (
            <View style={s.empty}>
              <Feather name="check-circle" size={52} color={colors.primary.light} />
              <Text style={s.emptyTxt}>Nenhum recebimento pendente!</Text>
            </View>
          ) : (
            <>
              {/* Hint */}
              <Text style={r.hint}>
                Paradas agrupadas por cidade · toque em Navegar para abrir o mapa
              </Text>

              {/* Timeline */}
              <View>
                {route.map((stop, idx) => (
                  <View key={stop.sale.id} style={{ position: 'relative', marginBottom: 10 }}>
                    {idx < route.length - 1 && (
                      <View style={r.line} />
                    )}
                    <StopCard stop={stop} />
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Excluded */}
          {excluded.length > 0 && (
            <>
              <TouchableOpacity
                style={r.excludedToggle}
                onPress={() => setShowExcluded(v => !v)}
              >
                <Feather
                  name={showExcluded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.primary.main}
                />
                <Text style={r.excludedTxt}>
                  {excluded.length} paradas sem tempo — ver próximos dias
                </Text>
              </TouchableOpacity>

              {showExcluded && (
                <View>
                  <Text style={r.hint}>
                    Sugestão: inclua estas paradas no dia seguinte, priorizando as atrasadas.
                  </Text>
                  {excluded.map(stop => (
                    <View key={stop.sale.id} style={{ marginBottom: 10 }}>
                      <StopCard stop={stop} dim />
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

type TabType = 'manual' | 'rota';

export function Recebimentos() {
  const [tab, setTab] = useState<TabType>('manual');

  return (
    <View style={s.container}>
      {/* Top tabs */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tab, tab === 'manual' && s.tabOn]}
          onPress={() => setTab('manual')}
        >
          <Feather
            name="dollar-sign"
            size={14}
            color={tab === 'manual' ? colors.primary.dark : colors.primary.main}
          />
          <Text style={[s.tabTxt, tab === 'manual' && s.tabTxtOn]}>
            Recebimento Manual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'rota' && s.tabOn]}
          onPress={() => setTab('rota')}
        >
          <Feather
            name="map-pin"
            size={14}
            color={tab === 'rota' ? colors.primary.dark : colors.primary.main}
          />
          <Text style={[s.tabTxt, tab === 'rota' && s.tabTxtOn]}>
            Rota de Recebimento
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'manual' ? <RecebimentoManual /> : <RotaRecebimento />}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.light.main },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.light.dark,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary.light + '30',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabOn:    { borderBottomColor: colors.primary.dark },
  tabTxt:   { fontSize: 12, fontWeight: '600', color: colors.primary.main },
  tabTxtOn: { color: colors.primary.dark, fontWeight: 'bold' },

  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.primary.dark,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sumLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 2 },
  sumValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.dark,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    borderRadius: 10,
    minHeight: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.primary.dark, fontWeight: '500' },

  // Chips
  chipRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 10, gap: 6 },
  chip:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.light.dark },
  chipOn:  { backgroundColor: colors.primary.dark },
  chipTxt:   { fontSize: 11, fontWeight: '600', color: colors.primary.main },
  chipTxtOn: { color: '#fff' },

  // Sale card
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  cardRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName:  { fontSize: 15, fontWeight: 'bold', color: colors.primary.dark, flex: 1, marginRight: 8 },
  cardTotal: { fontSize: 15, fontWeight: 'bold', color: colors.secondary.dark },
  cardAddr:  { fontSize: 12, color: colors.primary.main, flex: 1, marginRight: 8 },
  cardDue:   { fontSize: 11, color: colors.primary.main },
  cardItems: { fontSize: 11, color: colors.primary.light },

  // Badge
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeTxt: { fontSize: 10, fontWeight: 'bold', color: '#fff' },

  // Empty state
  empty:    { alignItems: 'center', paddingVertical: 56 },
  emptyTxt: { fontSize: 15, color: colors.primary.main, marginTop: 14, fontWeight: '500' },

  // Modal overlay
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHead: {
    borderTopWidth: 4,
    marginHorizontal: -24,
    marginTop: -24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    marginBottom: 16,
    backgroundColor: colors.light.main,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary.dark },
  sheetSub:   { fontSize: 13, color: colors.primary.main, marginTop: 2 },
  sheetLabel: { fontSize: 11, fontWeight: 'bold', color: colors.primary.main, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  itemList:  { marginBottom: 4 },
  itemRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.light.dark },
  itemTxt:   { fontSize: 14, color: colors.primary.dark },
  itemPrice: { fontSize: 14, color: colors.primary.main, fontWeight: '600' },
  amountInput: {
    backgroundColor: colors.light.main,
    borderRadius: 10,
    padding: 14,
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary.dark,
    textAlign: 'center',
    marginBottom: 16,
  },
});

const r = StyleSheet.create({
  // Config card
  configCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  configTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary.dark, marginBottom: 16 },
  configLabel: { fontSize: 11, fontWeight: 'bold', color: colors.primary.main, textTransform: 'uppercase', marginBottom: 6 },
  configInput: {
    backgroundColor: colors.light.main,
    borderRadius: 8,
    padding: 12,
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary.dark,
    textAlign: 'center',
  },
  datePick: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.main,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  datePickTxt: { fontSize: 14, color: colors.primary.dark, fontWeight: '600', textTransform: 'capitalize' },

  // Route summary
  summary: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sumItem:  { flex: 1, alignItems: 'center', gap: 3 },
  sumVal:   { fontSize: 15, fontWeight: 'bold', color: colors.primary.dark, textAlign: 'center' },
  sumLbl:   { fontSize: 10, color: colors.primary.main },
  sumDiv:   { width: 1, backgroundColor: colors.light.dark, marginVertical: 4 },

  // Stop card + timeline
  hint: { fontSize: 11, color: colors.primary.light, textAlign: 'center', marginBottom: 12, fontStyle: 'italic' },
  line: {
    position: 'absolute',
    left: 19,
    top: 40,
    bottom: -10,
    width: 2,
    backgroundColor: colors.light.dark,
    zIndex: 0,
  },
  stopCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    zIndex: 1,
  },
  marker:    { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  markerNum: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  stopRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  stopName:  { fontSize: 14, fontWeight: 'bold', color: colors.primary.dark, flex: 1, marginRight: 8 },
  stopTotal: { fontSize: 14, fontWeight: 'bold', color: colors.secondary.dark },
  stopAddr:  { fontSize: 11, color: colors.primary.main, marginBottom: 6 },
  navBtn:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary.dark, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  navTxt:    { fontSize: 11, fontWeight: 'bold', color: '#fff' },

  // Excluded
  excludedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.light.dark,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  excludedTxt: { fontSize: 12, color: colors.primary.main, fontWeight: '600' },
});
