import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
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
  Linking,
  RefreshControl,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, useToast } from '@/components';
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

function openDrivingNav(address: string, city: string) {
  const q = encodeURIComponent([address, city, 'Brasil'].filter(Boolean).join(', '));
  Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`,
  ).catch(() => {});
}

// ── InstallmentModal ──────────────────────────────────────────────────────────

interface InstallmentModalProps {
  sale:      PendingSale | null;
  onClose:   () => void;
  onConfirm: (ids: string[]) => Promise<void>;
  saving:    boolean;
}

function InstallmentModal({ sale, onClose, onConfirm, saving }: InstallmentModalProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!sale) return;
    const pending     = pendingInstallments(sale);
    const autoSelect  = pending.filter(i => getDays(i.due_date) <= 0);
    const preSelected = autoSelect.length > 0 ? autoSelect : pending.slice(0, 1);
    setCheckedIds(new Set(preSelected.map(i => i.id)));
  }, [sale?.id]);

  if (!sale) return null;

  const all           = sortedInstallments(sale);
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
          <View className="-mx-6 -mt-6 px-6 pt-5 pb-4 mb-3 bg-light rounded-t-3xl border-t-4 border-t-primary-dark">
            <Text className="text-lg font-bold text-primary-dark">{sale.clients?.name}</Text>
            <Text className="text-[12px] text-primary mt-0.5">
              {installmentCount(sale)}x · Total da venda: {renderPrice(saleTotal(sale))}
            </Text>
            {!!sale.observation && (
              <View className="flex-row items-start gap-1.5 mt-2 bg-white/70 rounded-[8px] px-3 py-2">
                <Feather name="message-square" size={13} color="#5A189A" style={{ marginTop: 1 }} />
                <Text className="text-[13px] text-primary-dark italic flex-1">{sale.observation}</Text>
              </View>
            )}
          </View>

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
                  <View
                    className="w-[22px] h-[22px] rounded-[5px] border-2 items-center justify-center mr-3"
                    style={{
                      borderColor:     isReceived ? '#1B8A3D' : isChecked ? '#3C096C' : '#C4B5D0',
                      backgroundColor: isReceived ? '#E6F7EC' : isChecked ? '#3C096C' : 'transparent',
                    }}
                  >
                    {(isReceived || isChecked) && (
                      <Feather name="check" size={12} color={isReceived ? '#1B8A3D' : '#fff'} />
                    )}
                  </View>

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
  const toast = useToast();
  const [sales, setSales]        = useState<PendingSale[]>([]);
  const [loading, setLoading]    = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [search, setSearch]      = useState('');
  const [filter, setFilter]      = useState<ManualFilter>('all');
  const [cityFilter, setCityFilter]     = useState('');
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [citySearch, setCitySearch]     = useState('');

  const [selected, setSelected] = useState<PendingSale | null>(null);
  const [amount,   setAmount]   = useState('');
  const [saving,   setSaving]   = useState(false);

  const [installSale,   setInstallSale]   = useState<PendingSale | null>(null);
  const [installSaving, setInstallSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setSales(await recebimentosService.getPending()); }
    catch (e: any) { toast.show(e.message, { type: 'error' }); }
    finally { setLoading(false); setRefresh(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cities = useMemo(
    () => [...new Set(
      sales.map(s => s.clients?.municipio?.nome).filter(Boolean) as string[]
    )].sort(),
    [sales],
  );

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
      const cityOk = !cityFilter || s.clients?.municipio?.nome === cityFilter;
      return ok && fok && cityOk;
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

  const confirmCash = async () => {
    if (!selected) return;
    const num = parseFloat(amount.replace(',', '.'));
    if (isNaN(num) || num <= 0) { toast.show('Valor inválido.', { type: 'error' }); return; }
    setSaving(true);
    try {
      await recebimentosService.markReceived(selected.id, num);
      setSales(p => p.filter(s => s.id !== selected.id));
      setSelected(null);
      toast.show(`${renderPrice(num)} registrado.`, { type: 'success' });
    } catch (e: any) {
      setSales(p => p.filter(s => s.id !== selected.id));
      setSelected(null);
      toast.show(e.message, { type: 'info' });
    } finally { setSaving(false); }
  };

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
      toast.show(
        `${ids.length} parcela${ids.length > 1 ? 's' : ''} · ${renderPrice(receivedAmt)} registrado.`,
        { type: 'success' },
      );
    } catch (e: any) {
      // Optimistic removal still happened in cache; show info
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
      toast.show(e.message, { type: 'info' });
    } finally { setInstallSaving(false); }
  };

  const Pill = ({ label, active, onPress, icon }: {
    label: string; active: boolean; onPress: () => void; icon?: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: active ? '#3C096C' : '#E1DAE8',
        gap: 4,
      }}
    >
      {icon && <Feather name={icon as any} size={10} color={active ? '#fff' : '#5A189A'} />}
      <Text style={{ fontSize: 11, fontWeight: '600', color: active ? '#fff' : '#5A189A' }}>
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

      {/* Filtros */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 8, gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Pill label="Todos"       active={filter === 'all'}     onPress={() => setFilter('all')}     />
          <Pill label="Atrasados"   active={filter === 'overdue'} onPress={() => setFilter('overdue')} />
          <Pill label="Hoje"        active={filter === 'today'}   onPress={() => setFilter('today')}   />
          <Pill label="Esta semana" active={filter === 'week'}    onPress={() => setFilter('week')}    />

          {cities.length > 0 && (
            <TouchableOpacity
              onPress={() => { setCitySearch(''); setCityModalVisible(true); }}
              style={{
                marginLeft: 'auto',
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
                backgroundColor: cityFilter ? '#3C096C' : '#E1DAE8',
              }}
            >
              <Feather name="map-pin" size={11} color={cityFilter ? '#fff' : '#5A189A'} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: cityFilter ? '#fff' : '#5A189A', maxWidth: 90 }} numberOfLines={1}>
                {cityFilter || 'Cidade'}
              </Text>
              {cityFilter
                ? <TouchableOpacity onPress={() => setCityFilter('')} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                    <Feather name="x" size={11} color="#fff" />
                  </TouchableOpacity>
                : <Feather name="chevron-down" size={11} color="#5A189A" />
              }
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modal de cidade */}
      <Modal visible={cityModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
            activeOpacity={1}
            onPress={() => setCityModalVisible(false)}
          />
          <View style={{ backgroundColor: '#F8F5FC', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 }}>
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#D5CBE0' }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#3C096C' }}>Filtrar por cidade</Text>
              <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                <Feather name="x" size={22} color="#3C096C" />
              </TouchableOpacity>
            </View>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: '#E1DAE8', borderRadius: 12,
              marginHorizontal: 16, marginBottom: 8,
              paddingHorizontal: 12, paddingVertical: 10,
            }}>
              <Feather name="search" size={15} color="#5A189A" />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: '#3C096C', fontWeight: '500' }}
                placeholder="Buscar cidade..."
                placeholderTextColor="#8B5A96"
                value={citySearch}
                onChangeText={setCitySearch}
                autoFocus
              />
              {!!citySearch && (
                <TouchableOpacity onPress={() => setCitySearch('')}>
                  <Feather name="x" size={15} color="#5A189A" />
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={[
                { name: '', label: 'Todas as cidades' },
                ...cities
                  .filter(c => !citySearch || c.toLowerCase().includes(citySearch.toLowerCase()))
                  .map(c => ({ name: c, label: c })),
              ]}
              keyExtractor={item => item.name}
              style={{ maxHeight: 320 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.name === '' ? !cityFilter : cityFilter === item.name;
                return (
                  <TouchableOpacity
                    onPress={() => { setCityFilter(item.name); setCityModalVisible(false); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#E1DAE8',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Feather name="map-pin" size={15} color={active ? '#3C096C' : '#8B5A96'} />
                      <Text style={{ fontSize: 15, fontWeight: active ? '700' : '400', color: active ? '#3C096C' : '#5A189A' }}>
                        {item.label}
                      </Text>
                    </View>
                    {active && <Feather name="check" size={16} color="#3C096C" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
                {!!item.observation && (
                  <View className="flex-row items-center gap-1 mt-1.5">
                    <Feather name="message-square" size={10} color="#8B5A96" />
                    <Text className="text-[11px] text-primary italic flex-1" numberOfLines={1}>
                      {item.observation}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* À vista modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
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
                    {!!selected.observation && (
                      <View className="flex-row items-start gap-1.5 mt-2 bg-white/70 rounded-[8px] px-3 py-2">
                        <Feather name="message-square" size={13} color="#5A189A" style={{ marginTop: 1 }} />
                        <Text className="text-[13px] text-primary-dark italic flex-1">{selected.observation}</Text>
                      </View>
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
        </KeyboardAvoidingView>
      </Modal>

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
  sale:   PendingSale;
  status: DueStatus;
  days:   number;
  total:  number;
  city:   string;
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R    = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function nearestNeighborSort(stops: RouteStop[]): RouteStop[] {
  if (stops.length < 2) return stops;

  const hasCoord = (s: RouteStop) =>
    s.sale.clients?.latitude != null && s.sale.clients?.longitude != null;

  if (!stops.some(hasCoord)) return stops;

  const remaining = [...stops];
  const sorted: RouteStop[] = [];

  // Start from the first stop (highest priority, already sorted)
  sorted.push(remaining.splice(0, 1)[0]);

  while (remaining.length > 0) {
    const last = sorted[sorted.length - 1];
    const lastLat = last.sale.clients?.latitude;
    const lastLon = last.sale.clients?.longitude;

    if (lastLat == null || lastLon == null) {
      sorted.push(remaining.splice(0, 1)[0]);
      continue;
    }

    let nearestIdx = 0;
    let nearestDist = Infinity;

    remaining.forEach((stop, i) => {
      const lat = stop.sale.clients?.latitude;
      const lon = stop.sale.clients?.longitude;
      if (lat == null || lon == null) return;
      const d = haversineKm(lastLat, lastLon, lat, lon);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    });

    sorted.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return sorted;
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

  const pool     = [...scored].sort((a, b) => priorityOf(a) - priorityOf(b));
  const selected = pool.splice(0, maxStops);
  const route    = nearestNeighborSort(selected);

  return { route, excluded: pool };
}

// ── SwipeCard ─────────────────────────────────────────────────────────────────

interface SwipeCardHandle {
  animateOut: (dir: 'left' | 'right') => Promise<void>;
}

interface SwipeCardProps {
  stop:             RouteStop;
  onRequestReceive: () => void;
  onSwipeLeft:      () => void;
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

    const cfg    = STATUS[stop.status];
    const days   = stop.days;
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
        <Animated.View style={[
          { position: 'absolute', borderWidth: 3, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, top: 28, zIndex: 20 },
          { left: 20, borderColor: '#00C851', transform: [{ rotate: '-15deg' }] },
          { opacity: receivedOpacity },
        ]}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', letterSpacing: 2, color: '#00C851' }}>RECEBIDO</Text>
        </Animated.View>

        <Animated.View style={[
          { position: 'absolute', borderWidth: 3, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, top: 28, zIndex: 20 },
          { right: 20, borderColor: '#DF1515', transform: [{ rotate: '15deg' }] },
          { opacity: skipOpacity },
        ]}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', letterSpacing: 2, color: '#DF1515' }}>PULAR</Text>
        </Animated.View>

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

          {!!stop.sale.observation && (
            <View className="flex-row items-start gap-2 bg-white/60 rounded-[10px] px-3 py-2.5 mb-3 mx-4">
              <Feather name="message-square" size={14} color="#5A189A" style={{ marginTop: 1 }} />
              <Text className="text-[13px] text-primary-dark italic flex-1">{stop.sale.observation}</Text>
            </View>
          )}

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
  const toast = useToast();
  const [remaining, setRemaining] = useState(initialRoute);
  const [skipped,   setSkipped]   = useState<RouteStop[]>([]);
  const [received,  setReceived]  = useState(0);
  const [collected, setCollected] = useState(0);

  const [showConfirm,      setShowConfirm]      = useState(false);
  const [amountStr,        setAmountStr]        = useState('');
  const [saving,           setSaving]           = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installSaving,    setInstallSaving]    = useState(false);

  const cardRef  = useRef<SwipeCardHandle>(null);
  const current  = remaining[0];
  const nextStop = remaining[1];

  const handleRequestReceive = () => {
    if (!current) return;
    if (isInstallment(current.sale)) {
      setShowInstallModal(true);
    } else {
      setAmountStr(current.total.toFixed(2).replace('.', ','));
      setShowConfirm(true);
    }
  };

  const handleConfirmReceive = async () => {
    if (!current) return;
    const num = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(num) || num <= 0) { toast.show('Valor inválido.', { type: 'error' }); return; }
    setSaving(true);
    try {
      await recebimentosService.markReceived(current.sale.id, num);
      setShowConfirm(false);
      await cardRef.current?.animateOut('right');
      setRemaining(p => p.slice(1));
      setReceived(r => r + 1);
      setCollected(c => c + num);
    } catch (e: any) {
      // offline — still advance (cached optimistically)
      setShowConfirm(false);
      await cardRef.current?.animateOut('right');
      setRemaining(p => p.slice(1));
      setReceived(r => r + 1);
      setCollected(c => c + num);
      toast.show(e.message, { type: 'info' });
    } finally { setSaving(false); }
  };

  const handleConfirmInstallments = async (ids: string[]) => {
    if (!current) return;
    setInstallSaving(true);
    const receivedAmt = (current.sale.sale_installments ?? [])
      .filter(i => ids.includes(i.id))
      .reduce((a, i) => a + i.amount, 0);
    try {
      await recebimentosService.markInstallmentsReceived(ids);
      setShowInstallModal(false);
      await cardRef.current?.animateOut('right');
      setRemaining(p => p.slice(1));
      setReceived(r => r + 1);
      setCollected(c => c + receivedAmt);
    } catch (e: any) {
      setShowInstallModal(false);
      await cardRef.current?.animateOut('right');
      setRemaining(p => p.slice(1));
      setReceived(r => r + 1);
      setCollected(c => c + receivedAmt);
      toast.show(e.message, { type: 'info' });
    } finally { setInstallSaving(false); }
  };

  const handleSkip       = () => { setSkipped(p => [...p, remaining[0]]); setRemaining(p => p.slice(1)); };
  const handlePularPress = () => { cardRef.current?.animateOut('left').then(handleSkip); };
  const handleNavigate   = () => {
    if (!current) return;
    openDrivingNav(current.sale.clients?.address ?? '', current.city);
  };

  if (remaining.length === 0) {
    return <CompletionView received={received} totalCollected={collected} skipped={skipped} onBack={onBack} />;
  }

  const total    = initialRoute.length;
  const progress = received / total;

  return (
    <View className="screen pb-[100px]">
      {/* Progress header */}
      <View className="bg-white border-b border-light-dark">
        <View className="flex-row items-center px-4 py-3">
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
      </View>

      {/* Card stack */}
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

      {/* Action buttons */}
      <View className="bg-white border-t border-light-dark pb-1">
        <View className="flex-row justify-between items-center px-8 pt-3 pb-1">
          <TouchableOpacity
            className="items-center justify-center w-[68px] h-[68px] rounded-full bg-[#FFF0F0] border-2 border-danger gap-0.5"
            onPress={handlePularPress}
          >
            <Feather name="x" size={26} color="#DF1515" />
            <Text className="text-[10px] font-bold text-danger text-center">Pular</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: '#3C096C', gap: 2,
            }}
            onPress={handleNavigate}
          >
            <Feather name="navigation" size={20} color="#C4D680" />
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#C4D680' }}>Navegar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center justify-center w-[68px] h-[68px] rounded-full bg-secondary-dark gap-0.5"
            onPress={handleRequestReceive}
          >
            <Feather name="check" size={26} color="#fff" />
            <Text className="text-[10px] font-bold text-white text-center">Recebido</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-[10px] text-primary-light text-center pb-1">
          ← pular · navegar · recebido →
        </Text>
      </View>

      {/* À vista confirm modal */}
      <Modal visible={showConfirm} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
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
        </KeyboardAvoidingView>
      </Modal>

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
  const toast = useToast();
  const [workHours,    setWorkHours]    = useState('8');
  const [avgStop,      setAvgStop]      = useState('15');
  const [targetDate,   setTargetDate]   = useState(new Date());
  const [showPicker,   setShowPicker]   = useState(false);
  const [route,        setRoute]        = useState<RouteStop[]>([]);
  const [excluded,     setExcluded]     = useState<RouteStop[]>([]);
  const [mode,         setMode]         = useState<'config' | 'swipe'>('config');
  const [loading,      setLoading]      = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);

  const generate = async () => {
    const hours = parseFloat(workHours.replace(',', '.'));
    const mins  = parseFloat(avgStop.replace(',', '.'));
    if (isNaN(hours) || hours <= 0 || isNaN(mins) || mins <= 0) {
      toast.show('Preencha horas e tempo por parada.', { type: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const sales = await recebimentosService.getPending();
      if (sales.length === 0) { toast.show('Não há recebimentos pendentes.', { type: 'info' }); return; }
      const { route: r, excluded: ex } = buildRoute(sales, hours, mins, targetDate);
      setRoute(r);
      setExcluded(ex);
      setMode('swipe');
    } catch (e: any) {
      toast.show(e.message, { type: 'error' });
    } finally { setLoading(false); }
  };

  if (mode === 'swipe') {
    return <RouteSwipeView initialRoute={route} onBack={() => setMode('config')} />;
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
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
