import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Linking,
  RefreshControl,
  FlatList,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button } from '@/components';
import { recebimentosService, PendingSale, SaleInstallment } from '@/services/recebimentos.service';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.28;

// ── Helpers ───────────────────────────────────────────────────────────────────

type DueStatus = 'overdue' | 'today' | 'week' | 'future';

const saleTotal        = (sale: PendingSale) => sale.sale_items.reduce((acc, i) => acc + i.price * i.quantity, 0);
const renderPrice      = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const formatDate       = (d: string | Date | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '';
const isInstallment    = (sale: PendingSale) => sale.payment !== 'cash' && (sale.installments ?? 1) > 1;
const installmentCount = (sale: PendingSale) => sale.installments ?? 1;

const pendingInstallments = (sale: PendingSale): SaleInstallment[] =>
  (sale.sale_installments ?? [])
    .filter(i => !i.received_at)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

const sortedInstallments = (sale: PendingSale): SaleInstallment[] =>
  [...(sale.sale_installments ?? [])].sort((a, b) => a.installment_number - b.installment_number);

const effectiveDueDate = (sale: PendingSale): string => {
  if (!isInstallment(sale)) return sale.dueDate;
  const pending = pendingInstallments(sale);
  return pending.length > 0 ? pending[0].due_date : sale.dueDate;
};

const pendingTotal = (sale: PendingSale): number => {
  if (!isInstallment(sale)) return saleTotal(sale);
  return pendingInstallments(sale).reduce((a, i) => a + i.amount, 0);
};

const getDays = (dueDate: string, ref: Date = new Date()) => {
  const due  = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const base = new Date(ref);     base.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - base.getTime()) / 86400000);
};

const getStatus = (dueDate: string, ref?: Date): DueStatus => {
  const d = getDays(dueDate, ref);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d <= 7) return 'week';
  return 'future';
};

const STATUS = {
  overdue: { label: 'Atrasado',    color: '#DF1515' },
  today:   { label: 'Vence hoje',  color: '#FF8C00' },
  week:    { label: 'Esta semana', color: '#758C36' },
  future:  { label: 'Em dia',      color: '#5A189A' },
};

// ── InstallmentModal ──────────────────────────────────────────────────────────

interface InstallmentModalProps {
  sale: PendingSale | null;
  onClose: () => void;
  onConfirm: (ids: string[]) => Promise<void>;
  saving: boolean;
}

function InstallmentModal({ sale, onClose, onConfirm, saving }: InstallmentModalProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!sale) return;
    const pending = pendingInstallments(sale);
    const autoSelect = pending.filter(i => getDays(i.due_date) <= 0);
    const preSelected = autoSelect.length > 0 ? autoSelect : pending.slice(0, 1);
    setCheckedIds(new Set(preSelected.map(i => i.id)));
  }, [sale?.id]);

  if (!sale) return null;

  const all = sortedInstallments(sale);
  const selectedTotal = all
    .filter(i => checkedIds.has(i.id))
    .reduce((a, i) => a + i.amount, 0);

  const toggle = (id: string) =>
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <Modal visible={!!sale} transparent animationType="slide">
      <TouchableOpacity
        className="modal-overlay-bottom"
        activeOpacity={1}
        onPress={() => !saving && onClose()}
      >
        <TouchableOpacity activeOpacity={1} className="modal-sheet-bottom">
          {/* Header */}
          <View className="-mx-6 -mt-6 px-6 pt-5 pb-4 mb-3 bg-light rounded-t-3xl border-t-4 border-t-primary-dark">
            <Text className="text-lg font-bold text-primary-dark">{sale.clients?.name}</Text>
            <Text className="text-[12px] text-primary mt-0.5">
              {installmentCount(sale)}x · Total da venda: {renderPrice(saleTotal(sale))}
            </Text>
          </View>

          {/* Installment list */}
          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {all.map(inst => {
              const isReceived = !!inst.received_at;
              const isChecked  = checkedIds.has(inst.id);
              const days       = getDays(inst.due_date);
              const st         = getStatus(inst.due_date);
              const color      = isReceived ? '#1B8A3D' : STATUS[st].color;

              return (
                <TouchableOpacity
                  key={inst.id}
                  disabled={isReceived || saving}
                  onPress={() => toggle(inst.id)}
                  className="flex-row items-center py-3 border-b border-light-dark"
                  style={{ opacity: isReceived ? 0.45 : 1 }}
                  activeOpacity={0.7}
                >
                  {/* Checkbox */}
                  <View
                    className="w-[22px] h-[22px] rounded-[5px] border-2 items-center justify-center mr-3"
                    style={{
                      borderColor: isReceived ? '#1B8A3D' : isChecked ? '#3C096C' : '#C4B5D0',
                      backgroundColor: isReceived ? '#E6F7EC' : isChecked ? '#3C096C' : 'transparent',
                    }}
                  >
                    {(isReceived || isChecked) && (
                      <Feather name="check" size={12} color={isReceived ? '#1B8A3D' : '#fff'} />
                    )}
                  </View>

                  {/* Info */}
                  <View className="flex-1">
                    <Text className="text-[13px] font-bold text-primary-dark">
                      Parcela {inst.installment_number}/{installmentCount(sale)}
                    </Text>
                    <Text className="text-[11px] text-primary mt-0.5">
                      {isReceived
                        ? `Recebida em ${formatDate(inst.received_at)}`
                        : formatDate(inst.due_date) +
                          (days < 0 ? ` · ${Math.abs(days)}d atraso` : days === 0 ? ' · Hoje' : '')}
                    </Text>
                  </View>

                  {/* Amount + badge */}
                  <View className="items-end">
                    <Text className="text-[14px] font-bold text-primary-dark">{renderPrice(inst.amount)}</Text>
                    {!isReceived && (
                      <View className="px-1.5 py-0.5 rounded-full mt-0.5" style={{ backgroundColor: color }}>
                        <Text className="text-[9px] font-bold text-white">
                          {days < 0 ? 'Atrasada' : days === 0 ? 'Hoje' : `Em ${days}d`}
                        </Text>
                      </View>
                    )}
                    {isReceived && (
                      <Feather name="check-circle" size={13} color="#1B8A3D" style={{ marginTop: 2 }} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Summary */}
          <View className="flex-row justify-between items-center py-2.5 mt-1 border-t border-light-dark">
            <Text className="text-[13px] text-primary">
              {checkedIds.size > 0
                ? `${checkedIds.size} parcela${checkedIds.size > 1 ? 's' : ''} selecionada${checkedIds.size > 1 ? 's' : ''}`
                : 'Selecione as parcelas a receber'}
            </Text>
            {checkedIds.size > 0 && (
              <Text className="text-base font-bold text-secondary-dark">{renderPrice(selectedTotal)}</Text>
            )}
          </View>

          <View className="flex-row mt-2">
            <Button
              title="Cancelar"
              variant="primary-dark"
              className="flex-1 mr-1.5"
              onPress={onClose}
              disabled={saving}
            />
            <Button
              title={saving ? 'Salvando...' : `Confirmar${checkedIds.size > 0 ? ` (${checkedIds.size})` : ''}`}
              variant="secondary"
              className="flex-[1.5]"
              onPress={() => onConfirm([...checkedIds])}
              disabled={saving || checkedIds.size === 0}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── RecebimentoManual ─────────────────────────────────────────────────────────

type ManualFilter = 'all' | 'overdue' | 'today' | 'week';

function RecebimentoManual() {
  const [sales, setSales]        = useState<PendingSale[]>([]);
  const [loading, setLoading]    = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [search, setSearch]      = useState('');
  const [filter, setFilter]      = useState<ManualFilter>('all');

  // Cash modal
  const [selected, setSelected]  = useState<PendingSale | null>(null);
  const [amount, setAmount]      = useState('');
  const [saving, setSaving]      = useState(false);

  // Installment modal
  const [installSale, setInstallSale]   = useState<PendingSale | null>(null);
  const [installSaving, setInstallSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setSales(await recebimentosService.getPending()); }
    catch (e: any) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); setRefresh(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = sales
    .filter(s => {
      const q   = search.toLowerCase();
      const ok  = !search || s.clients?.name.toLowerCase().includes(q) ||
        s.clients?.address?.toLowerCase().includes(q) ||
        s.clients?.municipio?.nome.toLowerCase().includes(q);
      const due = effectiveDueDate(s);
      const st  = getStatus(due);
      const fok = filter === 'all' || filter === st ||
        (filter === 'week' && st === 'today');
      return ok && fok;
    })
    .sort((a, b) => getDays(effectiveDueDate(a)) - getDays(effectiveDueDate(b)));

  const totalPending = sales.reduce((a, s) => a + pendingTotal(s), 0);
  const overdueCount = sales.filter(s => getStatus(effectiveDueDate(s)) === 'overdue').length;

  const openModal = (sale: PendingSale) => {
    if (isInstallment(sale)) {
      setInstallSale(sale);
    } else {
      setSelected(sale);
      setAmount(saleTotal(sale).toFixed(2).replace('.', ','));
    }
  };

  // Confirm À vista
  const confirmCash = async () => {
    if (!selected) return;
    const num = parseFloat(amount.replace(',', '.'));
    if (isNaN(num) || num <= 0) { Alert.alert('Valor inválido'); return; }
    setSaving(true);
    try {
      await recebimentosService.markReceived(selected.id, num);
      setSales(p => p.filter(s => s.id !== selected.id));
      setSelected(null);
      Alert.alert('Recebimento confirmado!', renderPrice(num) + ' registrado.');
    } catch (e: any) { Alert.alert('Erro', e.message); }
    finally { setSaving(false); }
  };

  // Confirm parcelas
  const confirmInstallments = async (ids: string[]) => {
    if (!installSale) return;
    setInstallSaving(true);
    try {
      await recebimentosService.markInstallmentsReceived(ids);
      const receivedAmt = (installSale.sale_installments ?? [])
        .filter(i => ids.includes(i.id))
        .reduce((a, i) => a + i.amount, 0);

      setSales(prev =>
        prev
          .map(s => {
            if (s.id !== installSale.id) return s;
            return {
              ...s,
              sale_installments: s.sale_installments.map(i =>
                ids.includes(i.id) ? { ...i, received_at: new Date().toISOString() } : i
              ),
            };
          })
          .filter(s => isInstallment(s) ? s.sale_installments.some(i => !i.received_at) : !s.received_at)
      );

      setInstallSale(null);
      Alert.alert(
        'Recebimento confirmado!',
        `${ids.length} parcela${ids.length > 1 ? 's' : ''} · ${renderPrice(receivedAmt)} registrado.`
      );
    } catch (e: any) { Alert.alert('Erro', e.message); }
    finally { setInstallSaving(false); }
  };

  const Chip = ({ label, val }: { label: string; val: ManualFilter }) => (
    <TouchableOpacity
      className={filter === val ? 'filter-chip-active' : 'filter-chip'}
      onPress={() => setFilter(val)}
    >
      <Text className={`text-[11px] font-semibold ${filter === val ? 'text-white' : 'text-primary'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1">
      {/* Summary bar */}
      <View className="flex-row justify-between bg-primary-dark px-5 py-3.5">
        <View>
          <Text className="text-[11px] text-white/65 mb-0.5">{sales.length} em aberto</Text>
          <Text className="text-xl font-bold text-white">{renderPrice(totalPending)}</Text>
        </View>
        <View className="items-end">
          <Text className="text-[11px] text-white/65 mb-0.5">Atrasados</Text>
          <Text className="text-xl font-bold text-[#FF8C8C]">{overdueCount}</Text>
        </View>
      </View>

      {/* Search */}
      <View className="flex-row items-center bg-light-dark mx-4 mt-2.5 mb-1 px-3.5 rounded-[10px] min-h-[44px] gap-2">
        <Feather name="search" size={16} color="#5A189A" />
        <TextInput
          className="flex-1 text-sm text-primary-dark font-medium"
          placeholder="Buscar cliente ou cidade..."
          placeholderTextColor="#8B5A96"
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={16} color="#5A189A" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View className="flex-row px-3 mb-2.5 gap-1.5">
        <Chip label="Todos" val="all" />
        <Chip label="Atrasados" val="overdue" />
        <Chip label="Hoje" val="today" />
        <Chip label="Esta semana" val="week" />
      </View>

      {loading ? (
        <View className="items-center py-14">
          <Text className="text-base text-primary font-medium mt-3.5">Carregando...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefresh(true); load(true); }}
              colors={['#3C096C']}
            />
          }
          ListEmptyComponent={
            <View className="items-center py-14">
              <Feather name="check-circle" size={52} color="#8B5A96" />
              <Text className="text-base text-primary font-medium mt-3.5">Nenhum recebimento encontrado</Text>
            </View>
          }
          renderItem={({ item }) => {
            const due  = effectiveDueDate(item);
            const st   = getStatus(due);
            const cfg  = STATUS[st];
            const days = getDays(due);
            const pend = pendingInstallments(item);
            const isInst = isInstallment(item);
            return (
              <TouchableOpacity
                className="bg-white rounded-[10px] p-3.5 mb-2 elevation-1"
                style={{ borderLeftWidth: 4, borderLeftColor: cfg.color }}
                onPress={() => openModal(item)}
                activeOpacity={0.75}
              >
                <View className="flex-row justify-between items-start mb-1">
                  <Text className="text-[15px] font-bold text-primary-dark flex-1 mr-2" numberOfLines={1}>
                    {item.clients?.name || 'Cliente removido'}
                  </Text>
                  <View className="items-end">
                    <Text className="text-[15px] font-bold text-secondary-dark">
                      {renderPrice(pendingTotal(item))}
                    </Text>
                    {isInst && (
                      <Text className="text-[10px] text-primary-light">
                        {pend.length}/{installmentCount(item)} parcelas
                      </Text>
                    )}
                  </View>
                </View>

                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-xs text-primary flex-1 mr-2" numberOfLines={1}>
                    {item.clients?.municipio?.nome ? `${item.clients.municipio.nome} · ` : ''}
                    {item.clients?.address}
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    {isInst && (
                      <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary-dark/15">
                        <Feather name="credit-card" size={9} color="#3C096C" />
                        <Text className="text-[9px] font-bold text-primary-dark">
                          {installmentCount(item)}x
                        </Text>
                      </View>
                    )}
                    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.color }}>
                      <Text className="text-[10px] font-bold text-white">
                        {days < 0 ? `${Math.abs(days)}d atraso` : days === 0 ? 'Hoje' : `${days}d`}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-[11px] text-primary">
                    {isInst ? `Próx. venc.: ${formatDate(due)}` : `Vence: ${formatDate(item.dueDate)}`}
                  </Text>
                  <Text className="text-[11px] text-primary-light">
                    {item.sale_items.length} {item.sale_items.length === 1 ? 'item' : 'itens'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* À vista modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <TouchableOpacity
          className="modal-overlay-bottom"
          activeOpacity={1}
          onPress={() => setSelected(null)}
        >
          <TouchableOpacity activeOpacity={1} className="modal-sheet-bottom">
            {selected && (() => {
              const cfg = STATUS[getStatus(selected.dueDate)];
              return (
                <>
                  <View
                    className="-mx-6 -mt-6 px-6 pt-6 pb-4 mb-4 bg-light rounded-t-3xl"
                    style={{ borderTopWidth: 4, borderTopColor: cfg.color }}
                  >
                    <Text className="text-xl font-bold text-primary-dark">{selected.clients?.name}</Text>
                    <Text className="text-[13px] text-primary mt-0.5">{selected.clients?.address}</Text>
                    {selected.clients?.municipio && (
                      <Text className="text-[13px] text-primary mt-0.5">
                        {selected.clients.municipio.nome} – {selected.clients.municipio.uf}
                      </Text>
                    )}
                  </View>

                  <View className="mb-1">
                    {selected.sale_items.map((item, i) => (
                      <View key={i} className="flex-row justify-between py-1.5 border-b border-light-dark">
                        <Text className="text-sm text-primary-dark">{item.quantity}x {item.products?.name}</Text>
                        <Text className="text-sm text-primary font-semibold">{renderPrice(item.price * item.quantity)}</Text>
                      </View>
                    ))}
                    <View className="flex-row justify-between py-1.5 mt-1.5">
                      <Text className="text-[15px] font-bold text-primary-dark">Total</Text>
                      <Text className="text-[15px] font-semibold text-secondary-dark">{renderPrice(saleTotal(selected))}</Text>
                    </View>
                  </View>

                  <Text className="label-upper mt-4">Valor Recebido (R$)</Text>
                  <TextInput
                    className="amount-input"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <View className="flex-row">
                    <Button title="Cancelar" variant="primary-dark" className="flex-1 mr-1.5" onPress={() => setSelected(null)} />
                    <Button title={saving ? 'Salvando...' : 'Confirmar'} variant="secondary" className="flex-[1.5]" onPress={confirmCash} disabled={saving} />
                  </View>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Installment modal */}
      <InstallmentModal
        sale={installSale}
        onClose={() => setInstallSale(null)}
        onConfirm={confirmInstallments}
        saving={installSaving}
      />
    </View>
  );
}

// ── RouteStop ─────────────────────────────────────────────────────────────────

interface RouteStop {
  sale: PendingSale;
  status: DueStatus;
  days: number;
  total: number;
  city: string;
}

function buildRoute(
  sales: PendingSale[],
  workHours: number,
  avgMins: number,
  targetDate: Date,
): { route: RouteStop[]; excluded: RouteStop[] } {
  const maxStops = Math.max(1, Math.floor((workHours * 60) / avgMins));

  const scored: RouteStop[] = sales.map(sale => {
    const due    = effectiveDueDate(sale);
    const days   = getDays(due, targetDate);
    const status = getStatus(due, targetDate);
    const city   = sale.clients?.municipio?.nome ||
      sale.clients?.address?.split(',')[0]?.trim() || 'Sem cidade';
    return { sale, status, days, total: pendingTotal(sale), city };
  });

  const priorityOf = (s: RouteStop) => {
    if (s.status === 'overdue') return -1000 + s.days;
    if (s.status === 'today')   return 0;
    if (s.status === 'week')    return s.days;
    return 100 + s.days;
  };

  const pool  = [...scored].sort((a, b) => priorityOf(a) - priorityOf(b));
  const route: RouteStop[] = [];

  while (pool.length > 0 && route.length < maxStops) {
    const lastCity = route.length > 0 ? route[route.length - 1].city : null;
    let pick = 0;
    if (lastCity) {
      const sameIdx = pool.slice(0, 6).findIndex(s => s.city === lastCity);
      if (sameIdx >= 0) pick = sameIdx;
    }
    route.push(pool[pick]);
    pool.splice(pick, 1);
  }

  return { route, excluded: pool };
}

// ── SwipeCard ─────────────────────────────────────────────────────────────────

interface SwipeCardHandle {
  animateOut: (dir: 'left' | 'right') => Promise<void>;
}

interface SwipeCardProps {
  stop: RouteStop;
  onRequestReceive: () => void;
  onSwipeLeft: () => void;
}

const SwipeCard = React.forwardRef<SwipeCardHandle, SwipeCardProps>(
  ({ stop, onRequestReceive, onSwipeLeft }, ref) => {
    const pan     = useRef(new Animated.ValueXY()).current;
    const swiping = useRef(false);
    const reqRef  = useRef(onRequestReceive);
    const skipRef = useRef(onSwipeLeft);
    reqRef.current  = onRequestReceive;
    skipRef.current = onSwipeLeft;

    const resetPos = () => {
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6, tension: 80,
      }).start();
    };

    const doAnimateOut = (dir: 'left' | 'right'): Promise<void> =>
      new Promise(resolve => {
        swiping.current = true;
        Animated.timing(pan, {
          toValue: { x: dir === 'right' ? SCREEN_W * 1.5 : -SCREEN_W * 1.5, y: 0 },
          duration: 280, useNativeDriver: false,
        }).start(() => resolve());
      });

    useImperativeHandle(ref, () => ({ animateOut: doAnimateOut }));

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder:  (_, g) => Math.abs(g.dx) > 8,
        onPanResponderMove: (_, g) => {
          if (swiping.current) return;
          pan.x.setValue(g.dx);
          pan.y.setValue(g.dy * 0.12);
        },
        onPanResponderRelease: (_, g) => {
          if (swiping.current) return;
          if (g.dx > SWIPE_THRESHOLD) {
            resetPos();
            setTimeout(() => reqRef.current(), 160);
          } else if (g.dx < -SWIPE_THRESHOLD) {
            doAnimateOut('left').then(() => skipRef.current());
          } else {
            resetPos();
          }
        },
        onPanResponderTerminate: () => { if (!swiping.current) resetPos(); },
      })
    ).current;

    const rotate = pan.x.interpolate({
      inputRange: [-SCREEN_W, 0, SCREEN_W], outputRange: ['-12deg', '0deg', '12deg'], extrapolate: 'clamp',
    });
    const receivedOpacity = pan.x.interpolate({ inputRange: [20, 100],  outputRange: [0, 1], extrapolate: 'clamp' });
    const skipOpacity     = pan.x.interpolate({ inputRange: [-100, -20], outputRange: [1, 0], extrapolate: 'clamp' });

    const cfg  = STATUS[stop.status];
    const days = stop.days;
    const isInst = isInstallment(stop.sale);
    const pend   = pendingInstallments(stop.sale);

    return (
      <Animated.View
        style={[
          {
            backgroundColor: '#E1DAE8', borderRadius: 20, padding: 24,
            elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15, shadowRadius: 8,
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10,
          },
          { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* RECEBIDO stamp */}
        <Animated.View style={[
          { position: 'absolute', borderWidth: 3, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, top: 28, zIndex: 20 },
          { left: 20, borderColor: '#00C851', transform: [{ rotate: '-15deg' }] },
          { opacity: receivedOpacity },
        ]}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', letterSpacing: 2, color: '#00C851' }}>RECEBIDO</Text>
        </Animated.View>

        {/* PULAR stamp */}
        <Animated.View style={[
          { position: 'absolute', borderWidth: 3, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, top: 28, zIndex: 20 },
          { right: 20, borderColor: '#DF1515', transform: [{ rotate: '15deg' }] },
          { opacity: skipOpacity },
        ]}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', letterSpacing: 2, color: '#DF1515' }}>PULAR</Text>
        </Animated.View>

        {/* Content */}
        <View className="flex-1 items-center justify-center">
          <Text className="text-[22px] font-bold text-primary-dark text-center mb-1">{stop.sale.clients?.name}</Text>
          <Text className="text-[13px] text-primary text-center mb-4 px-2">
            {stop.sale.clients?.address}
            {stop.city ? `, ${stop.city}` : ''}
            {stop.sale.clients?.municipio?.uf ? ` - ${stop.sale.clients.municipio.uf}` : ''}
          </Text>

          <Text className="text-[32px] font-bold text-center mb-1 text-secondary-dark">
            {renderPrice(stop.total)}
          </Text>

          {isInst && (
            <View className="flex-row items-center gap-1.5 mb-1">
              <Feather name="credit-card" size={12} color="#5A189A" />
              <Text className="text-[12px] text-primary font-semibold">
                {pend.length} de {installmentCount(stop.sale)} parcelas pendentes
              </Text>
            </View>
          )}

          <View className="w-4/5 border-t border-primary-light/40 my-3" />

          {stop.sale.sale_items.map((item, i) => (
            <Text key={i} className="text-[13px] text-primary-dark text-center mb-1">
              ({item.quantity}x) {item.products?.name} – {renderPrice(item.price * item.quantity)}
            </Text>
          ))}

          <View className="w-4/5 border-t border-primary-light/40 my-3" />

          <Text className="text-xs text-primary text-center mb-0.5">Data compra: {formatDate(stop.sale.created_at)}</Text>
          <Text className="text-xs text-primary text-center mb-4">
            {isInst ? `Próx. parcela: ${formatDate(effectiveDueDate(stop.sale))}` : `Vencimento: ${formatDate(stop.sale.dueDate)}`}
          </Text>

          <View className="mt-2 px-3.5 py-1.5 rounded-full" style={{ backgroundColor: cfg.color }}>
            <Text className="text-xs font-bold text-white tracking-wide">
              {days < 0
                ? `${Math.abs(days)} dia${Math.abs(days) > 1 ? 's' : ''} em atraso`
                : days === 0 ? 'Vence hoje'
                : `Vence em ${days} dia${days > 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }
);

// ── Geocoding ─────────────────────────────────────────────────────────────────

type GeoCoord = { lat: number; lng: number };

async function geocodeAddress(address: string, city: string, uf: string): Promise<GeoCoord | null> {
  const query = encodeURIComponent([address, city, uf, 'Brasil'].filter(Boolean).join(', '));
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=br`,
      { headers: { 'User-Agent': 'PISM-App/1.0' } }
    );
    const data = await res.json();
    if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

// ── MapErrorBoundary ──────────────────────────────────────────────────────────

class MapErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (msg: string) => void },
  { crashed: boolean; message: string }
> {
  state = { crashed: false, message: '' };

  static getDerivedStateFromError(error: Error) {
    return { crashed: true, message: error.message };
  }

  componentDidCatch(error: Error) { this.props.onError(error.message); }

  render() {
    if (this.state.crashed) return null;
    return this.props.children;
  }
}

// ── MapErrorScreen ────────────────────────────────────────────────────────────

function MapErrorScreen({ message }: { message: string }) {
  const isKeyMissing =
    message.toLowerCase().includes('api') || message.toLowerCase().includes('key') ||
    message.toLowerCase().includes('authentication') || message.toLowerCase().includes('authorization') ||
    message === 'map_load_error';

  return (
    <View className="flex-1 items-center justify-center bg-light p-6">
      <View className="bg-white rounded-2xl p-6 items-center w-full elevation-2">
        <View className="relative mb-4">
          <Feather name="map" size={40} color="#8B5A96" />
          <View className="absolute -bottom-0.5 -right-1 bg-danger w-5 h-5 rounded-full items-center justify-center border-2 border-white">
            <Feather name="alert-triangle" size={10} color="#fff" />
          </View>
        </View>

        <Text className="text-base font-bold text-primary-dark text-center mb-2.5">
          {isKeyMissing ? 'Chave do Google Maps não configurada' : 'Erro ao carregar o mapa'}
        </Text>

        {isKeyMissing ? (
          <>
            <Text className="text-[13px] text-primary text-center leading-5 mb-4">
              Para exibir o mapa é necessário configurar uma chave de API do Google Maps.
            </Text>
            <View className="w-full gap-1.5">
              <Text className="text-xs text-primary-dark leading-[18px]">1. Obtenha uma chave em console.cloud.google.com</Text>
              <Text className="text-xs text-primary-dark leading-[18px]">2. Adicione em android/local.properties:</Text>
              <View className="bg-primary-dark rounded-md px-3 py-2 my-1">
                <Text style={{ fontSize: 11, color: '#C4D680', fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier' }}>
                  GOOGLE_MAPS_API_KEY=SUA_CHAVE
                </Text>
              </View>
              <Text className="text-xs text-primary-dark leading-[18px]">3. Faça rebuild: npx expo run:android</Text>
              <Text className="text-xs text-primary-dark leading-[18px]">4. Consulte o arquivo GoogleMaps.md do projeto</Text>
            </View>
          </>
        ) : (
          <Text className="text-[13px] text-primary text-center leading-5">
            {message || 'Ocorreu um erro inesperado ao inicializar o mapa.'}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── RouteMap ──────────────────────────────────────────────────────────────────

interface RouteMapProps {
  stops: RouteStop[];
  currentStopId: string;
  geocodedCoords: Record<string, GeoCoord>;
  onCoordsUpdate: (id: string, coord: GeoCoord) => void;
}

function RouteMap({ stops, currentStopId, geocodedCoords, onCoordsUpdate }: RouteMapProps) {
  const [geocoding,    setGeocoding]    = useState(false);
  const [geocodingIdx, setGeocodingIdx] = useState(0);
  const [mapError,     setMapError]     = useState('');
  const mapRef     = useRef<MapView>(null);
  const didGeocode = useRef(false);

  const handleError = useCallback((msg: string) => { setMapError(msg || 'map_load_error'); }, []);

  useEffect(() => {
    if (didGeocode.current) return;
    didGeocode.current = true;
    const missing = stops.filter(s => !geocodedCoords[s.sale.id]);
    if (missing.length === 0) fitMap();
    else runGeocode(missing);
  }, []);

  const runGeocode = async (missing: RouteStop[]) => {
    setGeocoding(true);
    const newCoords: Record<string, GeoCoord> = {};
    for (let i = 0; i < missing.length; i++) {
      setGeocodingIdx(i + 1);
      const stop  = missing[i];
      const coord = await geocodeAddress(
        stop.sale.clients?.address || '', stop.city, stop.sale.clients?.municipio?.uf || ''
      );
      if (coord) { newCoords[stop.sale.id] = coord; onCoordsUpdate(stop.sale.id, coord); }
      if (i < missing.length - 1) await new Promise(r => setTimeout(r, 1200));
    }
    setGeocoding(false);
    fitMap(newCoords);
  };

  const fitMap = (extra: Record<string, GeoCoord> = {}) => {
    const all    = { ...geocodedCoords, ...extra };
    const coords = stops.map(s => all[s.sale.id]).filter((c): c is GeoCoord => !!c)
      .map(c => ({ latitude: c.lat, longitude: c.lng }));
    if (coords.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: true,
      });
    }
  };

  const polyline = stops.map(s => geocodedCoords[s.sale.id]).filter((c): c is GeoCoord => !!c)
    .map(c => ({ latitude: c.lat, longitude: c.lng }));

  const geocodedCount = stops.filter(s => geocodedCoords[s.sale.id]).length;
  const total         = stops.length;
  const hasKey        = !!process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!hasKey || mapError) return <MapErrorScreen message={mapError || 'map_load_error'} />;

  return (
    <View className="flex-1">
      {geocoding && (
        <View className="flex-row items-center gap-2 bg-primary-dark px-4 py-2.5 z-10">
          <ActivityIndicator size="small" color="#fff" />
          <Text className="text-xs text-white font-semibold">
            Localizando endereços... {geocodingIdx}/{total - geocodedCount + geocodingIdx}
          </Text>
        </View>
      )}

      <View
        className="absolute bottom-0 left-0 right-0 z-[5] px-3 py-1.5"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      >
        <Text className="text-[11px] text-white text-center">
          {geocodedCount}/{total} endereços encontrados · rota em linha reta
        </Text>
      </View>

      <MapErrorBoundary onError={handleError}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          showsUserLocation
          showsMyLocationButton
          showsCompass
          toolbarEnabled={false}
        >
          {polyline.length > 1 && (
            <Polyline coordinates={polyline} strokeColor="#3C096C" strokeWidth={2} lineDashPattern={[10, 6]} />
          )}
          {stops.map((stop, idx) => {
            const coord  = geocodedCoords[stop.sale.id];
            if (!coord) return null;
            const cfg    = STATUS[stop.status];
            const isCurr = stop.sale.id === currentStopId;
            const days   = stop.days;
            return (
              <Marker
                key={stop.sale.id}
                coordinate={{ latitude: coord.lat, longitude: coord.lng }}
                title={`${idx + 1}. ${stop.sale.clients?.name}`}
                description={
                  renderPrice(stop.total) + ' · ' +
                  (days < 0 ? `${Math.abs(days)}d atraso` : days === 0 ? 'Hoje' : `${days}d`)
                }
                anchor={{ x: 0.5, y: 1 }}
              >
                <View style={[
                  { width: isCurr ? 40 : 32, height: isCurr ? 40 : 32, borderRadius: isCurr ? 20 : 16,
                    alignItems: 'center', justifyContent: 'center', borderWidth: isCurr ? 3 : 2, borderColor: '#fff',
                    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3,
                    backgroundColor: isCurr ? '#FFD700' : cfg.color },
                ]}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: isCurr ? '#3C096C' : '#fff' }}>{idx + 1}</Text>
                </View>
                <View style={[
                  { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
                    borderLeftColor: 'transparent', borderRightColor: 'transparent',
                    alignSelf: 'center', borderTopColor: isCurr ? '#FFD700' : cfg.color },
                ]} />
              </Marker>
            );
          })}
        </MapView>
      </MapErrorBoundary>
    </View>
  );
}

// ── CompletionView ────────────────────────────────────────────────────────────

function CompletionView({
  received, totalCollected, skipped, onBack,
}: {
  received: number; totalCollected: number; skipped: RouteStop[]; onBack: () => void;
}) {
  return (
    <View className="flex-1 p-6 justify-center pb-[120px]">
      <View className="bg-white rounded-[20px] p-8 items-center mb-4 elevation-2">
        <Feather name="check-circle" size={64} color="#758C36" />
        <Text className="text-2xl font-bold text-primary-dark mt-4 mb-6">Rota concluída!</Text>

        <View className="flex-row w-full mb-5">
          <View className="flex-1 items-center gap-1">
            <Text className="text-lg font-bold text-primary-dark text-center">{received}</Text>
            <Text className="text-[11px] text-primary">recebimentos</Text>
          </View>
          <View className="w-px bg-light-dark my-1" />
          <View className="flex-1 items-center gap-1">
            <Text className="text-lg font-bold text-primary-dark text-center">{renderPrice(totalCollected)}</Text>
            <Text className="text-[11px] text-primary">total recebido</Text>
          </View>
        </View>

        {skipped.length > 0 && (
          <View className="w-full bg-light rounded-[10px] p-4">
            <Text className="text-[13px] font-bold text-primary-dark mb-2">
              {skipped.length} parada{skipped.length > 1 ? 's' : ''} não visitada{skipped.length > 1 ? 's' : ''}
            </Text>
            {skipped.map((stop, i) => (
              <Text key={i} className="text-xs text-primary mb-1">
                · {stop.sale.clients?.name} ({renderPrice(stop.total)})
              </Text>
            ))}
            <Text className="text-[11px] text-primary-light mt-2 italic">
              Inclua no próximo dia ou use Recebimento Manual.
            </Text>
          </View>
        )}
      </View>
      <Button title="Voltar à configuração" variant="primary-dark" onPress={onBack} />
    </View>
  );
}

// ── RouteSwipeView ────────────────────────────────────────────────────────────

function RouteSwipeView({ initialRoute, onBack }: { initialRoute: RouteStop[]; onBack: () => void }) {
  const [remaining, setRemaining]  = useState(initialRoute);
  const [skipped,   setSkipped]    = useState<RouteStop[]>([]);
  const [received,  setReceived]   = useState(0);
  const [collected, setCollected]  = useState(0);

  // Cash confirm modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [amountStr, setAmountStr]     = useState('');
  const [saving,    setSaving]        = useState(false);

  // Installment modal
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installSaving,    setInstallSaving]    = useState(false);

  const [showMap,        setShowMap]        = useState(false);
  const [geocodedCoords, setGeocodedCoords] = useState<Record<string, GeoCoord>>({});
  const cardRef = useRef<SwipeCardHandle>(null);

  const handleCoordsUpdate = useCallback((id: string, coord: GeoCoord) => {
    setGeocodedCoords(prev => ({ ...prev, [id]: coord }));
  }, []);

  const current  = remaining[0];
  const nextStop = remaining[1];
  const isDone   = remaining.length === 0;
  const total    = initialRoute.length;

  const handleRequestReceive = () => {
    if (!current) return;
    if (isInstallment(current.sale)) {
      setShowInstallModal(true);
    } else {
      setAmountStr(current.total.toFixed(2).replace('.', ','));
      setShowConfirm(true);
    }
  };

  // Confirm À vista on route
  const handleConfirmReceive = async () => {
    if (!current) return;
    const num = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(num) || num <= 0) { Alert.alert('Valor inválido'); return; }
    setSaving(true);
    try {
      await recebimentosService.markReceived(current.sale.id, num);
      setShowConfirm(false);
      await cardRef.current?.animateOut('right');
      setRemaining(p => p.slice(1));
      setReceived(r => r + 1);
      setCollected(c => c + num);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally { setSaving(false); }
  };

  // Confirm parcelas on route
  const handleConfirmInstallments = async (ids: string[]) => {
    if (!current) return;
    setInstallSaving(true);
    try {
      await recebimentosService.markInstallmentsReceived(ids);
      const receivedAmt = (current.sale.sale_installments ?? [])
        .filter(i => ids.includes(i.id))
        .reduce((a, i) => a + i.amount, 0);

      setShowInstallModal(false);
      await cardRef.current?.animateOut('right');
      setRemaining(p => p.slice(1));
      setReceived(r => r + 1);
      setCollected(c => c + receivedAmt);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally { setInstallSaving(false); }
  };

  const handleSkip       = () => { setSkipped(p => [...p, remaining[0]]); setRemaining(p => p.slice(1)); };
  const handlePularPress = () => { cardRef.current?.animateOut('left').then(handleSkip); };
  const openMaps         = () => {
    if (!current) return;
    const addr = encodeURIComponent([current.sale.clients?.address, current.city].filter(Boolean).join(', '));
    Linking.openURL(`https://maps.google.com/maps?q=${addr}`);
  };

  if (isDone) {
    return <CompletionView received={received} totalCollected={collected} skipped={skipped} onBack={onBack} />;
  }

  const progress = received / total;

  return (
    <View className="screen pb-[100px]">
      {/* Progress header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-light-dark">
        <TouchableOpacity onPress={onBack} className="p-1">
          <Feather name="arrow-left" size={20} color="#3C096C" />
        </TouchableOpacity>

        <View className="flex-1 mx-3">
          <Text className="text-[11px] text-primary font-semibold mb-1.5">
            {received} de {total} recebimentos · {renderPrice(collected)}
          </Text>
          <View className="h-1 bg-light-dark rounded-sm">
            <View
              className="h-1 bg-secondary-dark rounded-sm"
              style={{ width: `${progress * 100}%` as any }}
            />
          </View>
        </View>

        <Text className="text-[11px] font-bold text-primary-dark">{remaining.length} rest.</Text>
      </View>

      {/* Card stack OR map */}
      {showMap ? (
        <View className="flex-1 mx-4 my-3 relative">
          <RouteMap
            stops={initialRoute}
            currentStopId={current.sale.id}
            geocodedCoords={geocodedCoords}
            onCoordsUpdate={handleCoordsUpdate}
          />
        </View>
      ) : (
        <View className="flex-1 mx-4 my-3 relative">
          {nextStop && (
            <View
              className="items-center justify-center opacity-75 bg-light rounded-[20px] elevation-2"
              style={{ position: 'absolute', top: 12, left: 14, right: 14, bottom: -12, zIndex: 0 }}
            >
              <Text className="text-base font-bold text-primary-dark">{nextStop.sale.clients?.name}</Text>
              <Text className="text-xs text-primary mt-0.5">{nextStop.city}</Text>
              <Text className="text-sm font-bold text-secondary-dark mt-1">{renderPrice(nextStop.total)}</Text>
            </View>
          )}
          <SwipeCard
            key={current.sale.id}
            ref={cardRef}
            stop={current}
            onRequestReceive={handleRequestReceive}
            onSwipeLeft={handleSkip}
          />
        </View>
      )}

      {/* Action buttons */}
      <View className="flex-row justify-between items-center px-8 py-3 bg-white border-t border-light-dark">
        <TouchableOpacity
          className="items-center justify-center w-[72px] h-[72px] rounded-full bg-[#FFF0F0] border-2 border-danger gap-0.5"
          style={showMap ? { opacity: 0.4 } : undefined}
          onPress={showMap ? undefined : handlePularPress}
        >
          <Feather name="x" size={26} color="#DF1515" />
          <Text className="text-[10px] font-bold text-danger text-center">Pular</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-[52px] h-[52px] rounded-full items-center justify-center border"
          style={{ backgroundColor: showMap ? '#3C096C' : '#E1DAE8', borderColor: '#8B5A9640' }}
          onPress={() => setShowMap(v => !v)}
        >
          <Feather name={showMap ? 'layers' : 'map'} size={22} color={showMap ? '#fff' : '#3C096C'} />
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center justify-center w-[72px] h-[72px] rounded-full bg-secondary-dark gap-0.5"
          style={showMap ? { opacity: 0.4 } : undefined}
          onPress={showMap ? undefined : handleRequestReceive}
        >
          <Feather name="check" size={26} color="#fff" />
          <Text className="text-[10px] font-bold text-white text-center">Recebido</Text>
        </TouchableOpacity>
      </View>

      {!showMap && (
        <Text className="text-[10px] text-primary-light text-center pb-2 bg-white">
          ← arraste para pular · recebido para direita →
        </Text>
      )}

      {/* À vista confirm modal */}
      <Modal visible={showConfirm} transparent animationType="slide">
        <TouchableOpacity
          className="modal-overlay-bottom"
          activeOpacity={1}
          onPress={() => !saving && setShowConfirm(false)}
        >
          <TouchableOpacity activeOpacity={1} className="modal-sheet-bottom">
            <Text className="text-lg font-bold text-primary-dark text-center mb-1">Confirmar Recebimento</Text>
            <Text className="text-sm text-primary text-center mb-4">{current?.sale.clients?.name}</Text>
            <Text className="label-upper mt-2">Valor Recebido (R$)</Text>
            <TextInput
              className="amount-input"
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="decimal-pad"
              selectTextOnFocus
              autoFocus
            />
            <View className="flex-row">
              <Button title="Cancelar" variant="primary-dark" className="flex-1 mr-1.5" onPress={() => setShowConfirm(false)} disabled={saving} />
              <Button title={saving ? 'Salvando...' : 'Confirmar'} variant="secondary" className="flex-[1.5]" onPress={handleConfirmReceive} disabled={saving} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Installment modal */}
      <InstallmentModal
        sale={showInstallModal && current ? current.sale : null}
        onClose={() => setShowInstallModal(false)}
        onConfirm={handleConfirmInstallments}
        saving={installSaving}
      />
    </View>
  );
}

// ── RotaRecebimento ───────────────────────────────────────────────────────────

function RotaRecebimento() {
  const [workHours,  setWorkHours]  = useState('8');
  const [avgStop,    setAvgStop]    = useState('15');
  const [targetDate, setTargetDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [route,      setRoute]      = useState<RouteStop[]>([]);
  const [excluded,   setExcluded]   = useState<RouteStop[]>([]);
  const [mode,       setMode]       = useState<'config' | 'swipe'>('config');
  const [loading,    setLoading]    = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);

  const generate = async () => {
    const hours = parseFloat(workHours.replace(',', '.'));
    const mins  = parseFloat(avgStop.replace(',', '.'));
    if (isNaN(hours) || hours <= 0 || isNaN(mins) || mins <= 0) {
      Alert.alert('Parâmetros inválidos', 'Preencha horas e tempo por parada.');
      return;
    }
    setLoading(true);
    try {
      const sales = await recebimentosService.getPending();
      if (sales.length === 0) { Alert.alert('Tudo em dia!', 'Não há recebimentos pendentes.'); return; }
      const { route: r, excluded: ex } = buildRoute(sales, hours, mins, targetDate);
      setRoute(r);
      setExcluded(ex);
      setMode('swipe');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'swipe') {
    return <RouteSwipeView initialRoute={route} onBack={() => setMode('config')} />;
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Config card */}
      <View className="m-4 bg-white rounded-[14px] p-5 elevation-2">
        <Text className="text-base font-bold text-primary-dark mb-4">Parâmetros da Rota</Text>

        <View className="flex-row mb-3">
          <View className="flex-1 mr-2">
            <Text className="label-upper">Horas disponíveis</Text>
            <TextInput
              className="bg-light rounded-lg p-3 text-[22px] font-bold text-primary-dark text-center"
              value={workHours}
              onChangeText={setWorkHours}
              keyboardType="decimal-pad"
              placeholder="8"
              placeholderTextColor="#8B5A96"
            />
          </View>
          <View className="flex-1">
            <Text className="label-upper">Min. por parada</Text>
            <TextInput
              className="bg-light rounded-lg p-3 text-[22px] font-bold text-primary-dark text-center"
              value={avgStop}
              onChangeText={setAvgStop}
              keyboardType="decimal-pad"
              placeholder="15"
              placeholderTextColor="#8B5A96"
            />
          </View>
        </View>

        <Text className="label-upper">Data da rota</Text>
        <TouchableOpacity
          className="flex-row items-center bg-light rounded-lg p-3 mb-3 gap-2"
          onPress={() => setShowPicker(true)}
        >
          <Feather name="calendar" size={16} color="#3C096C" />
          <Text className="text-sm text-primary-dark font-semibold capitalize">
            {targetDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={targetDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => { setShowPicker(false); if (date) setTargetDate(date); }}
          />
        )}

        <Button
          title={loading ? 'Gerando rota...' : 'Gerar Rota'}
          variant="secondary"
          disabled={loading}
          onPress={generate}
          icon={<Feather name="map-pin" size={16} color="#0E0F0C" />}
        />
      </View>

      {/* Hint box */}
      <View className="flex-row items-start gap-2 bg-primary/15 mx-4 rounded-[10px] p-3.5 mb-2">
        <Feather name="info" size={16} color="#5A189A" />
        <Text className="flex-1 text-xs text-primary leading-[18px]">
          A rota agrupa paradas por cidade, prioriza atrasados e respeita seu tempo disponível.
          Vendas parceladas reaparecem a cada mês enquanto houver parcelas pendentes.
        </Text>
      </View>

      {excluded.length > 0 && (
        <View className="px-4">
          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 bg-light-dark rounded-lg p-3 mb-3"
            onPress={() => setShowExcluded(v => !v)}
          >
            <Feather name={showExcluded ? 'chevron-up' : 'chevron-down'} size={16} color="#5A189A" />
            <Text className="text-xs text-primary font-semibold">
              {excluded.length} paradas não incluídas na última rota
            </Text>
          </TouchableOpacity>
          {showExcluded && excluded.map((stop, i) => (
            <View key={i} className="bg-white rounded-lg p-3 mb-2 opacity-60 border-l-[3px] border-l-primary-light">
              <Text className="text-[13px] font-bold text-primary-dark">{stop.sale.clients?.name}</Text>
              <Text className="text-[11px] text-primary mt-0.5">{stop.city} · {renderPrice(stop.total)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

type TabType = 'manual' | 'rota';

export function Recebimentos() {
  const [tab, setTab] = useState<TabType>('manual');

  return (
    <View className="screen">
      <View className="flex-row bg-light-dark border-b border-primary-light/30">
        <TouchableOpacity
          className={`flex-1 flex-row items-center justify-center py-3.5 gap-1.5 border-b-2 ${tab === 'manual' ? 'border-b-primary-dark' : 'border-b-transparent'}`}
          onPress={() => setTab('manual')}
        >
          <Feather name="dollar-sign" size={14} color={tab === 'manual' ? '#3C096C' : '#5A189A'} />
          <Text className={`text-xs font-semibold ${tab === 'manual' ? 'text-primary-dark font-bold' : 'text-primary'}`}>
            Recebimento Manual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 flex-row items-center justify-center py-3.5 gap-1.5 border-b-2 ${tab === 'rota' ? 'border-b-primary-dark' : 'border-b-transparent'}`}
          onPress={() => setTab('rota')}
        >
          <Feather name="map-pin" size={14} color={tab === 'rota' ? '#3C096C' : '#5A189A'} />
          <Text className={`text-xs font-semibold ${tab === 'rota' ? 'text-primary-dark font-bold' : 'text-primary'}`}>
            Rota de Recebimento
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'manual' ? <RecebimentoManual /> : <RotaRecebimento />}
    </View>
  );
}
