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
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button } from '@/components';
import { colors } from '@/theme';
import { recebimentosService, PendingSale } from '@/services/recebimentos.service';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.28;

// ── Helpers ──────────────────────────────────────────────────────────────────

type DueStatus = 'overdue' | 'today' | 'week' | 'future';

const saleTotal = (sale: PendingSale) =>
  sale.sale_items.reduce((acc, i) => acc + i.price * i.quantity, 0);

const renderPrice = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

const formatDate = (d: string | Date | null) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR');
};

const getDays = (dueDate: string, ref: Date = new Date()) => {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const base = new Date(ref);
  base.setHours(0, 0, 0, 0);
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
  overdue: { label: 'Atrasado',    color: colors.danger.main },
  today:   { label: 'Vence hoje',  color: '#FF8C00' },
  week:    { label: 'Esta semana', color: colors.secondary.dark },
  future:  { label: 'Em dia',      color: colors.primary.main },
};

// ── RecebimentoManual ─────────────────────────────────────────────────────────

type ManualFilter = 'all' | 'overdue' | 'today' | 'week';

function RecebimentoManual() {
  const [sales, setSales]         = useState<PendingSale[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefresh]  = useState(false);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<ManualFilter>('all');
  const [selected, setSelected]   = useState<PendingSale | null>(null);
  const [amount, setAmount]       = useState('');
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setSales(await recebimentosService.getPending()); }
    catch (e: any) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); setRefresh(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = sales
    .filter(s => {
      const q = search.toLowerCase();
      const ok = !search || s.clients?.name.toLowerCase().includes(q) ||
        s.clients?.address?.toLowerCase().includes(q) ||
        s.clients?.municipio?.nome.toLowerCase().includes(q);
      const st = getStatus(s.dueDate);
      const fok = filter === 'all' || filter === st ||
        (filter === 'week' && st === 'today');
      return ok && fok;
    })
    .sort((a, b) => getDays(a.dueDate) - getDays(b.dueDate));

  const totalPending = sales.reduce((a, s) => a + saleTotal(s), 0);
  const overdueCount = sales.filter(s => getStatus(s.dueDate) === 'overdue').length;

  const openModal = (sale: PendingSale) => {
    setSelected(sale);
    setAmount(saleTotal(sale).toFixed(2).replace('.', ','));
  };

  const confirm = async () => {
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

      <View style={s.chipRow}>
        <Chip label="Todos" val="all" />
        <Chip label="Atrasados" val="overdue" />
        <Chip label="Hoje" val="today" />
        <Chip label="Esta semana" val="week" />
      </View>

      {loading ? (
        <View style={s.empty}><Text style={s.emptyTxt}>Carregando...</Text></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefresh(true); load(true); }}
              colors={[colors.primary.dark]}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="check-circle" size={52} color={colors.primary.light} />
              <Text style={s.emptyTxt}>Nenhum recebimento encontrado</Text>
            </View>
          }
          renderItem={({ item }) => {
            const st  = getStatus(item.dueDate);
            const cfg = STATUS[st];
            const days = getDays(item.dueDate);
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
                  <Text style={s.cardTotal}>{renderPrice(saleTotal(item))}</Text>
                </View>
                <View style={s.cardRow}>
                  <Text style={s.cardAddr} numberOfLines={1}>
                    {item.clients?.municipio?.nome
                      ? `${item.clients.municipio.nome} · `
                      : ''}
                    {item.clients?.address}
                  </Text>
                  <View style={[s.badge, { backgroundColor: cfg.color }]}>
                    <Text style={s.badgeTxt}>
                      {days < 0 ? `${Math.abs(days)}d atraso` : days === 0 ? 'Hoje' : `${days}d`}
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

      <Modal visible={!!selected} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <TouchableOpacity activeOpacity={1} style={s.sheet}>
            {selected && (() => {
              const cfg = STATUS[getStatus(selected.dueDate)];
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
                    <Button title="Cancelar" variant="primary-dark" style={{ flex: 1, marginRight: 6 }} onPress={() => setSelected(null)} />
                    <Button title={saving ? 'Salvando...' : 'Confirmar'} variant="secondary" style={{ flex: 1.5 }} onPress={confirm} disabled={saving} />
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

// ── RouteStop type ────────────────────────────────────────────────────────────

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
    const days   = getDays(sale.dueDate, targetDate);
    const status = getStatus(sale.dueDate, targetDate);
    const city   = sale.clients?.municipio?.nome ||
      sale.clients?.address?.split(',')[0]?.trim() || 'Sem cidade';
    return { sale, status, days, total: saleTotal(sale), city };
  });

  const priorityOf = (s: RouteStop) => {
    if (s.status === 'overdue') return -1000 + s.days;
    if (s.status === 'today')   return 0;
    if (s.status === 'week')    return s.days;
    return 100 + s.days;
  };

  const pool = [...scored].sort((a, b) => priorityOf(a) - priorityOf(b));
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
    const pan      = useRef(new Animated.ValueXY()).current;
    const swiping  = useRef(false);
    const reqRef   = useRef(onRequestReceive);
    const skipRef  = useRef(onSwipeLeft);
    reqRef.current  = onRequestReceive;
    skipRef.current = onSwipeLeft;

    function resetPos() {
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        friction: 6,
        tension: 80,
      }).start();
    }

    function doAnimateOut(dir: 'left' | 'right'): Promise<void> {
      return new Promise(resolve => {
        swiping.current = true;
        Animated.timing(pan, {
          toValue: { x: dir === 'right' ? SCREEN_W * 1.5 : -SCREEN_W * 1.5, y: 0 },
          duration: 280,
          useNativeDriver: false,
        }).start(() => resolve());
      });
    }

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
            // Snap back then show confirm modal
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
      inputRange: [-SCREEN_W, 0, SCREEN_W],
      outputRange: ['-12deg', '0deg', '12deg'],
      extrapolate: 'clamp',
    });
    const receivedOpacity = pan.x.interpolate({
      inputRange: [20, 100], outputRange: [0, 1], extrapolate: 'clamp',
    });
    const skipOpacity = pan.x.interpolate({
      inputRange: [-100, -20], outputRange: [1, 0], extrapolate: 'clamp',
    });

    const cfg  = STATUS[stop.status];
    const days = stop.days;

    return (
      <Animated.View
        style={[sw.card, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}
        {...panResponder.panHandlers}
      >
        {/* RECEBIDO stamp */}
        <Animated.View style={[sw.stamp, sw.stampRight, { opacity: receivedOpacity }]}>
          <Text style={[sw.stampTxt, { color: '#00C851' }]}>RECEBIDO</Text>
        </Animated.View>

        {/* PULAR stamp */}
        <Animated.View style={[sw.stamp, sw.stampLeft, { opacity: skipOpacity }]}>
          <Text style={[sw.stampTxt, { color: colors.danger.main }]}>PULAR</Text>
        </Animated.View>

        {/* Content */}
        <View style={sw.cardInner}>
          <Text style={sw.clientName}>{stop.sale.clients?.name}</Text>

          <Text style={sw.address}>
            {stop.sale.clients?.address}
            {stop.city ? `, ${stop.city}` : ''}
            {stop.sale.clients?.municipio?.uf ? ` - ${stop.sale.clients.municipio.uf}` : ''}
          </Text>

          <Text style={[sw.amount, { color: colors.secondary.dark }]}>
            {renderPrice(stop.total)}
          </Text>

          <View style={sw.divider} />

          {stop.sale.sale_items.map((item, i) => (
            <Text key={i} style={sw.item}>
              ({item.quantity}x) {item.products?.name} – {renderPrice(item.price * item.quantity)}
            </Text>
          ))}

          <View style={sw.divider} />

          <Text style={sw.dateText}>Data compra: {formatDate(stop.sale.created_at)}</Text>
          <Text style={sw.dateText}>Data vencimento: {formatDate(stop.sale.dueDate)}</Text>

          <View style={[sw.statusPill, { backgroundColor: cfg.color }]}>
            <Text style={sw.statusPillTxt}>
              {days < 0
                ? `${Math.abs(days)} dia${Math.abs(days) > 1 ? 's' : ''} em atraso`
                : days === 0
                ? 'Vence hoje'
                : `Vence em ${days} dia${days > 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }
);

// ── CompletionView ────────────────────────────────────────────────────────────

function CompletionView({
  received,
  totalCollected,
  skipped,
  onBack,
}: {
  received: number;
  totalCollected: number;
  skipped: RouteStop[];
  onBack: () => void;
}) {
  return (
    <View style={sw.completion}>
      <View style={sw.completionCard}>
        <Feather name="check-circle" size={64} color={colors.secondary.dark} />
        <Text style={sw.completionTitle}>Rota concluída!</Text>

        <View style={sw.completionStats}>
          <View style={sw.statItem}>
            <Text style={sw.statVal}>{received}</Text>
            <Text style={sw.statLbl}>recebimentos</Text>
          </View>
          <View style={sw.statDiv} />
          <View style={sw.statItem}>
            <Text style={sw.statVal}>{renderPrice(totalCollected)}</Text>
            <Text style={sw.statLbl}>total recebido</Text>
          </View>
        </View>

        {skipped.length > 0 && (
          <View style={sw.skippedBox}>
            <Text style={sw.skippedTitle}>
              {skipped.length} parada{skipped.length > 1 ? 's' : ''} não visitada{skipped.length > 1 ? 's' : ''}
            </Text>
            {skipped.map((stop, i) => (
              <Text key={i} style={sw.skippedItem}>
                · {stop.sale.clients?.name} ({renderPrice(stop.total)})
              </Text>
            ))}
            <Text style={sw.skippedHint}>
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

function RouteSwipeView({
  initialRoute,
  onBack,
}: {
  initialRoute: RouteStop[];
  onBack: () => void;
}) {
  const [remaining, setRemaining] = useState(initialRoute);
  const [skipped,   setSkipped]   = useState<RouteStop[]>([]);
  const [received,  setReceived]  = useState(0);
  const [collected, setCollected] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [amountStr, setAmountStr] = useState('');
  const [saving,    setSaving]    = useState(false);
  const cardRef = useRef<SwipeCardHandle>(null);

  const current  = remaining[0];
  const nextStop = remaining[1];
  const isDone   = remaining.length === 0;
  const total    = initialRoute.length;

  const handleRequestReceive = () => {
    if (!current) return;
    setAmountStr(current.total.toFixed(2).replace('.', ','));
    setShowConfirm(true);
  };

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
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    setSkipped(p => [...p, remaining[0]]);
    setRemaining(p => p.slice(1));
  };

  const handlePularPress = () => {
    cardRef.current?.animateOut('left').then(handleSkip);
  };

  const openMaps = () => {
    if (!current) return;
    const addr = encodeURIComponent(
      [current.sale.clients?.address, current.city].filter(Boolean).join(', ')
    );
    Linking.openURL(`https://maps.google.com/maps?q=${addr}`);
  };

  if (isDone) {
    return (
      <CompletionView
        received={received}
        totalCollected={collected}
        skipped={skipped}
        onBack={onBack}
      />
    );
  }

  const progress = received / total;

  return (
    <View style={{ flex: 1, backgroundColor: colors.light.main, paddingBottom: 100 }}>
      {/* Progress header */}
      <View style={sw.progressHeader}>
        <TouchableOpacity onPress={onBack} style={sw.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.primary.dark} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={sw.progressLabel}>
            {received} de {total} recebimentos · {renderPrice(collected)}
          </Text>
          <View style={sw.progressTrack}>
            <View style={[sw.progressFill, { width: `${progress * 100}%` as any }]} />
          </View>
        </View>

        <Text style={sw.progressRemaining}>{remaining.length} rest.</Text>
      </View>

      {/* Card stack */}
      <View style={sw.stackArea}>
        {/* Next card peek (behind) */}
        {nextStop && (
          <View style={sw.cardBehind}>
            <Text style={sw.behindName}>{nextStop.sale.clients?.name}</Text>
            <Text style={sw.behindCity}>{nextStop.city}</Text>
            <Text style={sw.behindAmt}>{renderPrice(nextStop.total)}</Text>
          </View>
        )}

        {/* Current swipeable card */}
        <SwipeCard
          key={current.sale.id}
          ref={cardRef}
          stop={current}
          onRequestReceive={handleRequestReceive}
          onSwipeLeft={handleSkip}
        />
      </View>

      {/* Action buttons */}
      <View style={sw.actionRow}>
        <TouchableOpacity style={sw.btnSkip} onPress={handlePularPress}>
          <Feather name="x" size={26} color={colors.danger.main} />
          <Text style={[sw.btnLbl, { color: colors.danger.main }]}>Pular</Text>
        </TouchableOpacity>

        <TouchableOpacity style={sw.btnNav} onPress={openMaps}>
          <Feather name="navigation" size={22} color={colors.primary.dark} />
        </TouchableOpacity>

        <TouchableOpacity style={sw.btnReceive} onPress={handleRequestReceive}>
          <Feather name="check" size={26} color="#fff" />
          <Text style={[sw.btnLbl, { color: '#fff' }]}>Recebido</Text>
        </TouchableOpacity>
      </View>

      {/* Hint */}
      <Text style={sw.swipeHint}>← arraste para pular · recebido para direita →</Text>

      {/* Confirm modal */}
      <Modal visible={showConfirm} transparent animationType="slide">
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => !saving && setShowConfirm(false)}
        >
          <TouchableOpacity activeOpacity={1} style={sw.confirmSheet}>
            <Text style={sw.confirmTitle}>Confirmar Recebimento</Text>
            <Text style={sw.confirmClient}>{current?.sale.clients?.name}</Text>

            <Text style={s.sheetLabel}>Valor Recebido (R$)</Text>
            <TextInput
              style={s.amountInput}
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="decimal-pad"
              selectTextOnFocus
              autoFocus
            />

            <View style={{ flexDirection: 'row' }}>
              <Button
                title="Cancelar"
                variant="primary-dark"
                style={{ flex: 1, marginRight: 6 }}
                onPress={() => setShowConfirm(false)}
                disabled={saving}
              />
              <Button
                title={saving ? 'Salvando...' : 'Confirmar'}
                variant="secondary"
                style={{ flex: 1.5 }}
                onPress={handleConfirmReceive}
                disabled={saving}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── RotaRecebimento ───────────────────────────────────────────────────────────

function RotaRecebimento() {
  const [workHours, setWorkHours] = useState('8');
  const [avgStop,   setAvgStop]   = useState('15');
  const [targetDate, setTargetDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [route,     setRoute]     = useState<RouteStop[]>([]);
  const [excluded,  setExcluded]  = useState<RouteStop[]>([]);
  const [mode,      setMode]      = useState<'config' | 'swipe'>('config');
  const [loading,   setLoading]   = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);

  const generate = async () => {
    const hours  = parseFloat(workHours.replace(',', '.'));
    const mins   = parseFloat(avgStop.replace(',', '.'));
    if (isNaN(hours) || hours <= 0 || isNaN(mins) || mins <= 0) {
      Alert.alert('Parâmetros inválidos', 'Preencha horas e tempo por parada.');
      return;
    }
    setLoading(true);
    try {
      const sales = await recebimentosService.getPending();
      if (sales.length === 0) {
        Alert.alert('Tudo em dia!', 'Não há recebimentos pendentes.');
        return;
      }
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
    return (
      <RouteSwipeView
        initialRoute={route}
        onBack={() => setMode('config')}
      />
    );
  }

  // Config screen
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
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
            onChange={(_, date) => { setShowPicker(false); if (date) setTargetDate(date); }}
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

      {/* Hint box */}
      <View style={r.hintBox}>
        <Feather name="info" size={16} color={colors.primary.main} />
        <Text style={r.hintTxt}>
          A rota agrupa paradas por cidade, prioriza atrasados e respeita seu tempo disponível.
          Após gerar, use o cartão para confirmar ou pular cada parada.
        </Text>
      </View>

      {excluded.length > 0 && (
        <View style={{ paddingHorizontal: 16 }}>
          <TouchableOpacity
            style={r.excludedToggle}
            onPress={() => setShowExcluded(v => !v)}
          >
            <Feather name={showExcluded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary.main} />
            <Text style={r.excludedTxt}>
              {excluded.length} paradas não incluídas na última rota
            </Text>
          </TouchableOpacity>
          {showExcluded && excluded.map((stop, i) => (
            <View key={i} style={r.exCard}>
              <Text style={r.exName}>{stop.sale.clients?.name}</Text>
              <Text style={r.exDetail}>{stop.city} · {renderPrice(stop.total)}</Text>
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
    <View style={s.container}>
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tab, tab === 'manual' && s.tabOn]}
          onPress={() => setTab('manual')}
        >
          <Feather name="dollar-sign" size={14}
            color={tab === 'manual' ? colors.primary.dark : colors.primary.main} />
          <Text style={[s.tabTxt, tab === 'manual' && s.tabTxtOn]}>
            Recebimento Manual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'rota' && s.tabOn]}
          onPress={() => setTab('rota')}
        >
          <Feather name="map-pin" size={14}
            color={tab === 'rota' ? colors.primary.dark : colors.primary.main} />
          <Text style={[s.tabTxt, tab === 'rota' && s.tabTxtOn]}>
            Rota de Recebimento
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'manual' ? <RecebimentoManual /> : <RotaRecebimento />}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.main },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.light.dark,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary.light + '30',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent', gap: 6,
  },
  tabOn:    { borderBottomColor: colors.primary.dark },
  tabTxt:   { fontSize: 12, fontWeight: '600', color: colors.primary.main },
  tabTxtOn: { color: colors.primary.dark, fontWeight: 'bold' },

  summaryBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.primary.dark, paddingHorizontal: 20, paddingVertical: 14,
  },
  sumLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 2 },
  sumValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.light.dark,
    marginHorizontal: 16, marginTop: 10, marginBottom: 4,
    paddingHorizontal: 14, borderRadius: 10, minHeight: 44, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.primary.dark, fontWeight: '500' },

  chipRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 10, gap: 6 },
  chip:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.light.dark },
  chipOn:  { backgroundColor: colors.primary.dark },
  chipTxt:   { fontSize: 11, fontWeight: '600', color: colors.primary.main },
  chipTxtOn: { color: '#fff' },

  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8,
    borderLeftWidth: 4, elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2,
  },
  cardRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName:  { fontSize: 15, fontWeight: 'bold', color: colors.primary.dark, flex: 1, marginRight: 8 },
  cardTotal: { fontSize: 15, fontWeight: 'bold', color: colors.secondary.dark },
  cardAddr:  { fontSize: 12, color: colors.primary.main, flex: 1, marginRight: 8 },
  cardDue:   { fontSize: 11, color: colors.primary.main },
  cardItems: { fontSize: 11, color: colors.primary.light },

  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeTxt: { fontSize: 10, fontWeight: 'bold', color: '#fff' },

  empty:    { alignItems: 'center', paddingVertical: 56 },
  emptyTxt: { fontSize: 15, color: colors.primary.main, marginTop: 14, fontWeight: '500' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetHead: {
    borderTopWidth: 4, marginHorizontal: -24, marginTop: -24,
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, marginBottom: 16,
    backgroundColor: colors.light.main, borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary.dark },
  sheetSub:   { fontSize: 13, color: colors.primary.main, marginTop: 2 },
  sheetLabel: { fontSize: 11, fontWeight: 'bold', color: colors.primary.main, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  itemList: { marginBottom: 4 },
  itemRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.light.dark },
  itemTxt:  { fontSize: 14, color: colors.primary.dark },
  itemPrice:{ fontSize: 14, color: colors.primary.main, fontWeight: '600' },
  amountInput: {
    backgroundColor: colors.light.main, borderRadius: 10, padding: 14,
    fontSize: 28, fontWeight: 'bold', color: colors.primary.dark, textAlign: 'center', marginBottom: 16,
  },
});

// Swipe view styles
const sw = StyleSheet.create({
  // Card (current)
  card: {
    backgroundColor: colors.light.dark,
    borderRadius: 20,
    padding: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10,
  },
  cardInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  clientName: { fontSize: 22, fontWeight: 'bold', color: colors.primary.dark, textAlign: 'center', marginBottom: 4 },
  address:    { fontSize: 13, color: colors.primary.main, textAlign: 'center', marginBottom: 20, paddingHorizontal: 8 },
  amount:     { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  divider:    { width: '80%', height: 1, backgroundColor: colors.primary.light + '40', marginVertical: 12 },
  item:       { fontSize: 13, color: colors.primary.dark, textAlign: 'center', marginBottom: 4 },
  dateText:   { fontSize: 12, color: colors.primary.main, textAlign: 'center', marginBottom: 2 },
  statusPill: { marginTop: 16, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusPillTxt: { fontSize: 12, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },

  // Swipe stamps (Tinder-style)
  stamp: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    top: 28,
    zIndex: 20,
  },
  stampRight: {
    left: 20,
    borderColor: '#00C851',
    transform: [{ rotate: '-15deg' }],
  },
  stampLeft: {
    right: 20,
    borderColor: colors.danger.main,
    transform: [{ rotate: '15deg' }],
  },
  stampTxt: { fontSize: 22, fontWeight: 'bold', letterSpacing: 2 },

  // Card behind (next stop peek)
  cardBehind: {
    position: 'absolute',
    top: 12, left: 14, right: 14, bottom: -12,
    backgroundColor: colors.light.main,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
    opacity: 0.75,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  behindName: { fontSize: 16, fontWeight: 'bold', color: colors.primary.dark },
  behindCity: { fontSize: 12, color: colors.primary.main, marginTop: 2 },
  behindAmt:  { fontSize: 14, fontWeight: 'bold', color: colors.secondary.dark, marginTop: 4 },

  // Stack area
  stackArea: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 12,
    position: 'relative',
  },

  // Progress header
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.light.dark,
  },
  backBtn:         { padding: 4 },
  progressLabel:   { fontSize: 11, color: colors.primary.main, fontWeight: '600', marginBottom: 6 },
  progressTrack:   { height: 4, backgroundColor: colors.light.dark, borderRadius: 2 },
  progressFill:    { height: 4, backgroundColor: colors.secondary.dark, borderRadius: 2 },
  progressRemaining:{ fontSize: 11, fontWeight: 'bold', color: colors.primary.dark },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.light.dark,
  },
  btnSkip: {
    alignItems: 'center', justifyContent: 'center',
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFF0F0',
    borderWidth: 2, borderColor: colors.danger.main,
    gap: 2,
  },
  btnNav: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.light.dark,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.primary.light + '40',
  },
  btnReceive: {
    alignItems: 'center', justifyContent: 'center',
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.secondary.dark,
    gap: 2,
  },
  btnLbl: { fontSize: 10, fontWeight: 'bold', textAlign: 'center' },

  swipeHint: {
    fontSize: 10, color: colors.primary.light, textAlign: 'center',
    paddingBottom: 8, backgroundColor: '#fff',
  },

  // Confirm sheet
  confirmSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  confirmTitle:  { fontSize: 18, fontWeight: 'bold', color: colors.primary.dark, textAlign: 'center', marginBottom: 4 },
  confirmClient: { fontSize: 14, color: colors.primary.main, textAlign: 'center', marginBottom: 8 },

  // Completion
  completion: { flex: 1, padding: 24, justifyContent: 'center', paddingBottom: 120 },
  completionCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 32,
    alignItems: 'center', marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  completionTitle: { fontSize: 24, fontWeight: 'bold', color: colors.primary.dark, marginTop: 16, marginBottom: 24 },
  completionStats: { flexDirection: 'row', width: '100%', marginBottom: 20 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statVal:  { fontSize: 18, fontWeight: 'bold', color: colors.primary.dark, textAlign: 'center' },
  statLbl:  { fontSize: 11, color: colors.primary.main },
  statDiv:  { width: 1, backgroundColor: colors.light.dark, marginVertical: 4 },
  skippedBox: {
    width: '100%', backgroundColor: colors.light.main, borderRadius: 10, padding: 16,
  },
  skippedTitle: { fontSize: 13, fontWeight: 'bold', color: colors.primary.dark, marginBottom: 8 },
  skippedItem:  { fontSize: 12, color: colors.primary.main, marginBottom: 4 },
  skippedHint:  { fontSize: 11, color: colors.primary.light, marginTop: 8, fontStyle: 'italic' },
});

// Config / route styles
const r = StyleSheet.create({
  configCard: {
    margin: 16, backgroundColor: '#fff', borderRadius: 14, padding: 20,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  configTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary.dark, marginBottom: 16 },
  configLabel: { fontSize: 11, fontWeight: 'bold', color: colors.primary.main, textTransform: 'uppercase', marginBottom: 6 },
  configInput: {
    backgroundColor: colors.light.main, borderRadius: 8, padding: 12,
    fontSize: 22, fontWeight: 'bold', color: colors.primary.dark, textAlign: 'center',
  },
  datePick: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.light.main,
    borderRadius: 8, padding: 12, marginBottom: 12, gap: 8,
  },
  datePickTxt: { fontSize: 14, color: colors.primary.dark, fontWeight: '600', textTransform: 'capitalize' },

  hintBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.primary.main + '15',
    marginHorizontal: 16, borderRadius: 10, padding: 14, marginBottom: 8,
  },
  hintTxt: { flex: 1, fontSize: 12, color: colors.primary.main, lineHeight: 18 },

  excludedToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.light.dark, borderRadius: 8,
    padding: 12, marginBottom: 12,
  },
  excludedTxt: { fontSize: 12, color: colors.primary.main, fontWeight: '600' },

  exCard: {
    backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8,
    opacity: 0.6, borderLeftWidth: 3, borderLeftColor: colors.primary.light,
  },
  exName:   { fontSize: 13, fontWeight: 'bold', color: colors.primary.dark },
  exDetail: { fontSize: 11, color: colors.primary.main, marginTop: 2 },
});
