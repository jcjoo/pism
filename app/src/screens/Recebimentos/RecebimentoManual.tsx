import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  FlatList, Platform, KeyboardAvoidingView, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, useToast } from '@/components';
import { recebimentosService, PendingSale } from '@/services/recebimentos.service';
import { ManualFilter } from './types';
import {
  saleTotal, renderPrice, formatDate, isInstallment, installmentCount,
  pendingInstallments, effectiveDueDate, pendingTotal, getDays, getStatus, STATUS,
} from './helpers';
import { InstallmentModal } from './InstallmentModal';
import { colors } from '@/theme/color';

export function RecebimentoManual() {
  const toast = useToast();
  const [sales, setSales]        = useState<PendingSale[]>([]);
  const [loading, setLoading]    = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [search, setSearch]      = useState('');
  const [filter, setFilter]      = useState<ManualFilter>('all');
  const [cityFilter, setCityFilter]         = useState('');
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [citySearch, setCitySearch]         = useState('');

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
        backgroundColor: active ? colors.primary.dark : colors.light.dark,
        gap: 4,
      }}
    >
      {icon && <Feather name={icon as any} size={10} color={active ? 'white' : colors.primary.main} />}
      <Text style={{ fontSize: 11, fontWeight: '600', color: active ? 'white' : colors.primary.main }}>
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
        <Feather name="search" size={16} color={colors.primary.main} />
        <TextInput
          className="flex-1 text-sm text-primary-dark font-medium"
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
                backgroundColor: cityFilter ? colors.primary.dark : colors.light.dark,
              }}
            >
              <Feather name="map-pin" size={11} color={cityFilter ? 'white' : colors.primary.main} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: cityFilter ? 'white' : colors.primary.main, maxWidth: 90 }} numberOfLines={1}>
                {cityFilter || 'Cidade'}
              </Text>
              {cityFilter
                ? <TouchableOpacity onPress={() => setCityFilter('')} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                    <Feather name="x" size={11} color="white" />
                  </TouchableOpacity>
                : <Feather name="chevron-down" size={11} color={colors.primary.main} />
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
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary.dark }}>Filtrar por cidade</Text>
              <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                <Feather name="x" size={22} color={colors.primary.dark} />
              </TouchableOpacity>
            </View>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: colors.light.dark, borderRadius: 12,
              marginHorizontal: 16, marginBottom: 8,
              paddingHorizontal: 12, paddingVertical: 10,
            }}>
              <Feather name="search" size={15} color={colors.primary.main} />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: colors.primary.dark, fontWeight: '500' }}
                placeholder="Buscar cidade..."
                placeholderTextColor={colors.primary.light}
                value={citySearch}
                onChangeText={setCitySearch}
                autoFocus
              />
              {!!citySearch && (
                <TouchableOpacity onPress={() => setCitySearch('')}>
                  <Feather name="x" size={15} color={colors.primary.main} />
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
                      paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.light.dark,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Feather name="map-pin" size={15} color={active ? colors.primary.dark : colors.primary.light} />
                      <Text style={{ fontSize: 15, fontWeight: active ? '700' : '400', color: active ? colors.primary.dark : colors.primary.main }}>
                        {item.label}
                      </Text>
                    </View>
                    {active && <Feather name="check" size={16} color={colors.primary.dark} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Lista */}
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
              colors={[colors.primary.dark]}
            />
          }
          ListEmptyComponent={
            <View className="items-center py-14">
              <Feather name="check-circle" size={52} color={colors.primary.light} />
              <Text className="text-base text-primary font-medium mt-3.5">Nenhum recebimento encontrado</Text>
            </View>
          }
          renderItem={({ item }) => {
            const due    = effectiveDueDate(item);
            const st     = getStatus(due);
            const cfg    = STATUS[st];
            const days   = getDays(due);
            const pend   = pendingInstallments(item);
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
                        <Feather name="credit-card" size={9} color={colors.primary.dark} />
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
                    <Feather name="message-square" size={10} color={colors.primary.light} />
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

      {/* Modal à vista */}
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
                          <Feather name="message-square" size={13} color={colors.primary.main} style={{ marginTop: 1 }} />
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
