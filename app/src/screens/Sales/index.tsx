import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, ScrollView,
  Platform, TouchableOpacity, Modal, FlatList, Alert, TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Input, Button, QuantitySelector, Select } from '@/components';
import { colors, typography } from '@/theme';

import { clientsService, Client } from '@/services/clients.service';
import { productsService, Product } from '@/services/products.service';
import { salesService, SaleFilters } from '@/services/sales.service';
import { recebimentosService } from '@/services/recebimentos.service';

type Step = 'filter' | 'list' | 'details' | 'edit';
type StatusFilter = 'all' | 'pending' | 'received';

// ── Helpers ───────────────────────────────────────────────────────────────────

const renderPrice = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;
const formatDate  = (d: Date | null | string) => d ? new Date(d).toLocaleDateString('pt-BR') : '';
const calcTotal   = (items: any[]) => items.reduce((a, i) => a + i.price * i.quantity, 0);

const getDaysUntilDue = (dueDate: string) => {
  const due  = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const now  = new Date();        now.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / 86400000);
};

type DueStatus = 'received' | 'overdue' | 'today' | 'soon' | 'ok';

function getDueStatus(sale: any): DueStatus {
  if (sale.received_at) return 'received';
  const d = getDaysUntilDue(sale.dueDate);
  if (d < 0)  return 'overdue';
  if (d === 0) return 'today';
  if (d <= 5)  return 'soon';
  return 'ok';
}

const STATUS_CONFIG: Record<DueStatus, { label: string; color: string; bg: string }> = {
  received: { label: 'Recebido',    color: '#1B8A3D', bg: '#E6F7EC' },
  overdue:  { label: 'Atrasado',    color: colors.danger.main, bg: '#FFF0F0' },
  today:    { label: 'Vence hoje',  color: '#B86E00', bg: '#FFF8E6' },
  soon:     { label: 'Vence em breve', color: colors.secondary.dark, bg: '#F6FBEA' },
  ok:       { label: 'A receber',   color: colors.primary.main, bg: colors.light.main },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function Sales() {
  const [step, setStep] = useState<Step>('filter');
  const [loading, setLoading] = useState(false);

  const [clientsList,  setClientsList]  = useState<Client[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);

  // Filters
  const [filterClient,  setFilterClient]  = useState<Client | null>(null);
  const [filterProduct, setFilterProduct] = useState<Product | null>(null);
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('all');

  const [dateFieldTarget, setDateFieldTarget] = useState<string | null>(null);
  const [showDatePicker,  setShowDatePicker]  = useState(false);
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd,   setDateEnd]   = useState<Date | null>(null);
  const [dueStart,  setDueStart]  = useState<Date | null>(null);
  const [dueEnd,    setDueEnd]    = useState<Date | null>(null);

  // Results
  const [salesData,    setSalesData]    = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  // Edit sale
  const [editCart,        setEditCart]        = useState<any[]>([]);
  const [editDueDate,     setEditDueDate]     = useState<Date | null>(new Date());
  const [editPaymentMode, setEditPaymentMode] = useState('À vista');

  // Edit receipt
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [receiptDate,         setReceiptDate]         = useState(new Date());
  const [receiptAmount,       setReceiptAmount]       = useState('');
  const [savingReceipt,       setSavingReceipt]       = useState(false);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType,    setModalType]    = useState<'cliente' | 'product'>('cliente');

  useEffect(() => {
    const load = async () => {
      try {
        setClientsList(await clientsService.getAll(true));
        setProductsList(await productsService.getAll(true));
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const handleFetchSales = async () => {
    setLoading(true);
    try {
      const filters: SaleFilters = {
        clientId:  filterClient?.id,
        dateStart: dateStart?.toISOString(),
        dateEnd:   dateEnd?.toISOString(),
        dueStart:  dueStart?.toISOString(),
        dueEnd:    dueEnd?.toISOString(),
      };

      let results = await salesService.getSales(filters) || [];

      if (filterProduct) {
        results = results.filter(s =>
          s.sale_items.some((i: any) => i.product_id === filterProduct.id)
        );
      }

      if (statusFilter === 'received') results = results.filter(s => !!s.received_at);
      if (statusFilter === 'pending')  results = results.filter(s => !s.received_at);

      setSalesData(results);
      setStep('list');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    Alert.alert('Atenção', 'Deseja apagar esta venda?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar', style: 'destructive', onPress: async () => {
          setLoading(true);
          try {
            await salesService.delete(selectedSale.id);
            Alert.alert('Sucesso', 'Venda apagada!');
            setStep('filter');
            setSalesData([]);
          } catch (e: any) {
            Alert.alert('Erro', e.message);
          } finally { setLoading(false); }
        },
      },
    ]);
  };

  // ── Edit ───────────────────────────────────────────────────────────────────

  const startEdit = () => {
    setEditCart(selectedSale.sale_items.map((si: any) => ({
      id: si.id, product: si.products, quantity: si.quantity, price: si.price,
    })));
    setEditDueDate(new Date(selectedSale.dueDate));
    setEditPaymentMode(selectedSale.payment === 'cash' ? 'À vista' : `${selectedSale.installments}x`);
    setStep('edit');
  };

  const handleSaveEdit = async () => {
    Alert.alert('Simulação', 'Fluxo de salvar a ser finalizado.');
    setStep('details');
  };

  const switchPayment = () =>
    setEditPaymentMode(p => p === 'À vista' ? '2x' : p === '2x' ? '3x' : 'À vista');

  // ── Receipt actions ────────────────────────────────────────────────────────

  const openEditReceipt = () => {
    setReceiptDate(selectedSale.received_at ? new Date(selectedSale.received_at) : new Date());
    setReceiptAmount(
      (selectedSale.received_amount ?? calcTotal(selectedSale.sale_items))
        .toFixed(2).replace('.', ',')
    );
    setReceiptModalVisible(true);
  };

  const handleSaveReceipt = async () => {
    const num = parseFloat(receiptAmount.replace(',', '.'));
    if (isNaN(num) || num <= 0) { Alert.alert('Valor inválido'); return; }
    setSavingReceipt(true);
    try {
      await recebimentosService.updateReceived(selectedSale.id, receiptDate.toISOString(), num);
      const updated = { ...selectedSale, received_at: receiptDate.toISOString(), received_amount: num };
      setSelectedSale(updated);
      setSalesData(p => p.map(s => s.id === updated.id ? updated : s));
      setReceiptModalVisible(false);
    } catch (e: any) { Alert.alert('Erro', e.message); }
    finally { setSavingReceipt(false); }
  };

  const handleRemoveReceipt = () => {
    Alert.alert('Remover recebimento', 'Deseja desfazer este recebimento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive', onPress: async () => {
          setSavingReceipt(true);
          try {
            await recebimentosService.removeReceived(selectedSale.id);
            const updated = { ...selectedSale, received_at: null, received_amount: null };
            setSelectedSale(updated);
            setSalesData(p => p.map(s => s.id === updated.id ? updated : s));
          } catch (e: any) { Alert.alert('Erro', e.message); }
          finally { setSavingReceipt(false); }
        },
      },
    ]);
  };

  const handleMarkReceived = async () => {
    const total = calcTotal(selectedSale.sale_items);
    setReceiptDate(new Date());
    setReceiptAmount(total.toFixed(2).replace('.', ','));
    setReceiptModalVisible(true);
  };

  const selectModalItem = (item: any) => {
    if (modalType === 'cliente') {
      if (step === 'filter') setFilterClient(item);
    } else {
      if (step === 'filter') setFilterProduct(item);
    }
    setModalVisible(false);
  };

  // ── List summary ───────────────────────────────────────────────────────────

  const totalAll      = salesData.reduce((a, s) => a + calcTotal(s.sale_items), 0);
  const totalReceived = salesData.filter(s => s.received_at)
    .reduce((a, s) => a + (s.received_amount ?? calcTotal(s.sale_items)), 0);
  const totalPending  = salesData.filter(s => !s.received_at)
    .reduce((a, s) => a + calcTotal(s.sale_items), 0);

  // ── Chip ───────────────────────────────────────────────────────────────────

  const StatusChip = ({ label, val }: { label: string; val: StatusFilter }) => (
    <TouchableOpacity
      style={[styles.chip, statusFilter === val && styles.chipOn]}
      onPress={() => setStatusFilter(val)}
    >
      <Text style={[styles.chipTxt, statusFilter === val && styles.chipTxtOn]}>{label}</Text>
    </TouchableOpacity>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── FILTER ───────────────────────────────────────────────────── */}
        {step === 'filter' && (
          <View>
            <Select
              label="Cliente"
              value={filterClient?.name || ''}
              placeholder="Todos os Clientes"
              onPress={() => { setModalType('cliente'); setModalVisible(true); }}
            />
            <Select
              label="Mercadoria"
              value={filterProduct?.name || ''}
              placeholder="Todas as Mercadorias"
              onPress={() => { setModalType('product'); setModalVisible(true); }}
            />

            <View style={styles.row}>
              <Select label="Venda de" value={formatDate(dateStart)} onPress={() => { setDateFieldTarget('dateStart'); setShowDatePicker(true); }} style={styles.flex} />
              <View style={{ width: 8 }} />
              <Select label="Venda até" value={formatDate(dateEnd)} onPress={() => { setDateFieldTarget('dateEnd'); setShowDatePicker(true); }} style={styles.flex} />
            </View>
            <View style={styles.row}>
              <Select label="Venc. de" value={formatDate(dueStart)} onPress={() => { setDateFieldTarget('dueStart'); setShowDatePicker(true); }} style={styles.flex} />
              <View style={{ width: 8 }} />
              <Select label="Venc. até" value={formatDate(dueEnd)} onPress={() => { setDateFieldTarget('dueEnd'); setShowDatePicker(true); }} style={styles.flex} />
            </View>

            {/* Status filter chips */}
            <Text style={styles.filterLabel}>Status do recebimento</Text>
            <View style={styles.chipRow}>
              <StatusChip label="Todos" val="all" />
              <StatusChip label="A receber" val="pending" />
              <StatusChip label="Recebidos" val="received" />
            </View>

            <View style={[styles.row, { marginTop: 16 }]}>
              <Button title="Limpar" variant="primary-dark" style={styles.flex} onPress={() => {
                setFilterClient(null); setFilterProduct(null);
                setDateStart(null); setDateEnd(null); setDueStart(null); setDueEnd(null);
                setStatusFilter('all');
              }} />
              <View style={{ width: 8 }} />
              <Button
                title={loading ? 'Buscando...' : 'Consultar'}
                variant="secondary"
                style={styles.flex}
                onPress={handleFetchSales}
                disabled={loading}
              />
            </View>
          </View>
        )}

        {/* ── LIST ─────────────────────────────────────────────────────── */}
        {step === 'list' && (
          <View>
            {/* Summary cards */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total</Text>
                <Text style={styles.summaryValue}>{renderPrice(totalAll)}</Text>
              </View>
              <View style={[styles.summaryCard, { borderLeftColor: '#1B8A3D' }]}>
                <Text style={styles.summaryLabel}>Recebido</Text>
                <Text style={[styles.summaryValue, { color: '#1B8A3D' }]}>{renderPrice(totalReceived)}</Text>
              </View>
              <View style={[styles.summaryCard, { borderLeftColor: colors.danger.main }]}>
                <Text style={styles.summaryLabel}>A receber</Text>
                <Text style={[styles.summaryValue, { color: colors.danger.main }]}>{renderPrice(totalPending)}</Text>
              </View>
            </View>

            {/* List */}
            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>{salesData.length} venda{salesData.length !== 1 ? 's' : ''}</Text>
                <Feather name="chevron-up" size={20} color={colors.primary.dark} />
              </View>

              {salesData.length === 0 ? (
                <Text style={styles.emptyText}>Nenhuma venda encontrada.</Text>
              ) : (
                salesData.map((sale, idx) => {
                  const st  = getDueStatus(sale);
                  const cfg = STATUS_CONFIG[st];
                  const days = sale.received_at ? null : getDaysUntilDue(sale.dueDate);
                  return (
                    <TouchableOpacity
                      key={sale.id}
                      style={styles.listItem}
                      onPress={() => { setSelectedSale(sale); setStep('details'); }}
                    >
                      <Text style={styles.listIdx}>{idx + 1}</Text>

                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.listName} numberOfLines={1}>
                          {sale.clients?.name || 'Cliente deletado'}
                        </Text>
                        <Text style={styles.listSub} numberOfLines={1}>
                          {formatDate(sale.created_at)}
                          {days !== null && days < 0 && ` · ${Math.abs(days)}d atraso`}
                          {days === 0 && ' · Vence hoje'}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={styles.listPrice}>{renderPrice(calcTotal(sale.sale_items))}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: cfg.color }]}>
                          <Text style={styles.statusBadgeTxt}>{cfg.label}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <View style={[styles.row, { marginTop: 16 }]}>
              <Button title="Voltar" variant="primary-dark" style={styles.flex} onPress={() => setStep('filter')} />
              <Button title="Nova Busca" variant="secondary" style={styles.flex} onPress={() => { setStep('filter'); setSalesData([]); }} />
            </View>
          </View>
        )}

        {/* ── DETAILS ──────────────────────────────────────────────────── */}
        {step === 'details' && selectedSale && (() => {
          const st  = getDueStatus(selectedSale);
          const cfg = STATUS_CONFIG[st];
          const days = selectedSale.received_at ? null : getDaysUntilDue(selectedSale.dueDate);
          const total = calcTotal(selectedSale.sale_items);
          return (
            <View>
              <View style={[styles.detailsCard, { borderTopWidth: 4, borderTopColor: cfg.color }]}>
                {/* Client info */}
                <Text style={styles.detailsClient}>{selectedSale.clients?.name}</Text>
                <Text style={styles.detailsAddress}>
                  {selectedSale.clients?.address}
                </Text>

                {/* Total */}
                <Text style={styles.detailsTotal}>{renderPrice(total)}</Text>

                {/* Items */}
                {selectedSale.sale_items.map((item: any) => (
                  <Text key={item.id} style={styles.detailsItem}>
                    ({item.quantity}x) {item.products?.name} — {renderPrice(item.price)}
                  </Text>
                ))}

                {/* Dates */}
                <Text style={styles.detailsDates}>Data compra: {formatDate(selectedSale.created_at)}</Text>
                <Text style={styles.detailsDates}>Vencimento: {formatDate(selectedSale.dueDate)}</Text>

                {/* Receipt status block */}
                <View style={[styles.receiptBlock, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                  {selectedSale.received_at ? (
                    <>
                      <View style={styles.receiptRow}>
                        <Feather name="check-circle" size={16} color={cfg.color} />
                        <Text style={[styles.receiptTitle, { color: cfg.color }]}>Recebido</Text>
                      </View>
                      <Text style={styles.receiptDetail}>
                        Em: {formatDate(selectedSale.received_at)}
                      </Text>
                      <Text style={styles.receiptDetail}>
                        Valor: {renderPrice(selectedSale.received_amount ?? total)}
                      </Text>
                      {selectedSale.received_amount != null &&
                        Math.abs(selectedSale.received_amount - total) > 0.01 && (
                          <Text style={[styles.receiptDetail, { color: colors.danger.main }]}>
                            Diferença: {renderPrice(selectedSale.received_amount - total)}
                          </Text>
                        )}
                      <View style={[styles.row, { marginTop: 10 }]}>
                        <Button
                          title="Editar recebimento"
                          variant="primary-light"
                          style={styles.flex}
                          onPress={openEditReceipt}
                          icon={<Feather name="edit-2" size={14} color="#fff" />}
                        />
                        <View style={{ width: 8 }} />
                        <Button
                          title="Remover"
                          variant="danger"
                          style={{ paddingHorizontal: 12 }}
                          onPress={handleRemoveReceipt}
                          disabled={savingReceipt}
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.receiptRow}>
                        <Feather name="clock" size={16} color={cfg.color} />
                        <Text style={[styles.receiptTitle, { color: cfg.color }]}>
                          {st === 'overdue'
                            ? `Atrasado ${Math.abs(days!)} dia${Math.abs(days!) > 1 ? 's' : ''}`
                            : st === 'today'
                            ? 'Vence hoje'
                            : `Vence em ${days} dia${days! > 1 ? 's' : ''}`}
                        </Text>
                      </View>
                      <Text style={styles.receiptDetail}>Aguardando recebimento</Text>
                      <Button
                        title="Marcar como recebido"
                        variant="secondary"
                        style={{ marginTop: 10 }}
                        onPress={handleMarkReceived}
                        icon={<Feather name="check" size={14} color={colors.dark.main} />}
                      />
                    </>
                  )}
                </View>
              </View>

              <View style={[styles.row, { marginTop: 16 }]}>
                <Button title="Voltar" variant="primary" style={styles.flex} onPress={() => setStep('list')} />
                <View style={{ width: 8 }} />
                <Button title="Editar" variant="primary-dark" style={styles.flex} onPress={startEdit} />
              </View>
            </View>
          );
        })()}

        {/* ── EDIT ─────────────────────────────────────────────────────── */}
        {step === 'edit' && selectedSale && (
          <View>
            <Select label="Cliente" value={selectedSale.clients?.name} disabled />

            <View style={styles.cartContainer}>
              {editCart.map((item, idx) => (
                <View key={idx} style={styles.editCartItem}>
                  <Text style={styles.cartItemText}>
                    {idx + 1}. {item.product?.name} ({item.quantity}x) – {renderPrice(item.price * item.quantity)}
                  </Text>
                  <TouchableOpacity onPress={() => setEditCart(editCart.filter((_, i) => i !== idx))}>
                    <Text style={styles.cartItemRemove}>Remover</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <Text style={styles.cartTotalText}>
                Total: {renderPrice(calcTotal(editCart))}
              </Text>
            </View>

            <View style={[styles.row, { marginTop: 16 }]}>
              <Select
                label="Data venc."
                value={formatDate(editDueDate)}
                onPress={() => { setDateFieldTarget('editDueDate'); setShowDatePicker(true); }}
                style={styles.flex}
              />
              <View style={{ width: 8 }} />
              <QuantitySelector label={editPaymentMode} value={0} onChange={switchPayment} />
            </View>

            <Input placeholder="Observação..." multiline style={{ minHeight: 64, marginTop: 4 }} />

            <View style={[styles.row, { marginTop: 8 }]}>
              <Button title="Cancelar" variant="primary-dark" style={styles.flex} onPress={() => setStep('details')} />
              <View style={{ width: 8 }} />
              <Button title="Salvar" variant="secondary" style={styles.flex} onPress={handleSaveEdit} />
            </View>

            <Button
              title={loading ? 'Apagando...' : 'Apagar Venda'}
              variant="danger"
              onPress={handleDelete}
              disabled={loading}
              style={{ marginTop: 8 }}
            />
          </View>
        )}

      </ScrollView>

      {/* Date picker */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (!date) return;
            if (dateFieldTarget === 'dateStart')       setDateStart(date);
            else if (dateFieldTarget === 'dateEnd')     setDateEnd(date);
            else if (dateFieldTarget === 'dueStart')    setDueStart(date);
            else if (dateFieldTarget === 'dueEnd')      setDueEnd(date);
            else if (dateFieldTarget === 'editDueDate') setEditDueDate(date);
            else if (dateFieldTarget === 'receiptDate') setReceiptDate(date);
          }}
        />
      )}

      {/* Edit receipt modal */}
      <Modal visible={receiptModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => !savingReceipt && setReceiptModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.receiptSheet}>
            <Text style={styles.receiptSheetTitle}>
              {selectedSale?.received_at ? 'Editar Recebimento' : 'Marcar como Recebido'}
            </Text>
            {selectedSale && (
              <Text style={styles.receiptSheetSub}>{selectedSale.clients?.name}</Text>
            )}

            <Text style={styles.receiptSheetLabel}>Data do recebimento</Text>
            <TouchableOpacity
              style={styles.receiptDateBtn}
              onPress={() => { setDateFieldTarget('receiptDate'); setShowDatePicker(true); }}
            >
              <Feather name="calendar" size={16} color={colors.primary.dark} />
              <Text style={styles.receiptDateBtnTxt}>{formatDate(receiptDate)}</Text>
            </TouchableOpacity>

            <Text style={styles.receiptSheetLabel}>Valor recebido (R$)</Text>
            <TextInput
              style={styles.receiptAmountInput}
              value={receiptAmount}
              onChangeText={setReceiptAmount}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />

            <View style={styles.row}>
              <Button
                title="Cancelar"
                variant="primary-dark"
                style={styles.flex}
                onPress={() => setReceiptModalVisible(false)}
                disabled={savingReceipt}
              />
              <View style={{ width: 8 }} />
              <Button
                title={savingReceipt ? 'Salvando...' : 'Confirmar'}
                variant="secondary"
                style={{ flex: 1.5 }}
                onPress={handleSaveReceipt}
                disabled={savingReceipt}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Selector modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Selecione {modalType === 'cliente' ? 'o Cliente' : 'a Mercadoria'}
            </Text>
            <FlatList
              data={
                modalType === 'cliente'
                  ? [{ id: 'none', name: 'Todos os Clientes' } as any, ...clientsList]
                  : [{ id: 'none', name: 'Todas as Mercadorias' } as any, ...productsList]
              }
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => selectModalItem(item.id === 'none' ? null : item)}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>Nenhum item.</Text>}
            />
            <Button title="Fechar" onPress={() => setModalVisible(false)} variant="primary" />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.light.main },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
  row:           { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  flex:          { flex: 1 },

  // Filter chips
  filterLabel: {
    fontSize: 11, fontWeight: 'bold', color: colors.primary.main,
    textTransform: 'uppercase', marginTop: 12, marginBottom: 6, letterSpacing: 0.5,
  },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.light.dark },
  chipOn:  { backgroundColor: colors.primary.dark },
  chipTxt:    { fontSize: 12, fontWeight: '600', color: colors.primary.main },
  chipTxtOn:  { color: '#fff' },

  // Summary row
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 4 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: colors.primary.main,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  summaryLabel: { fontSize: 10, color: colors.primary.main, fontWeight: '600', marginBottom: 2 },
  summaryValue: { fontSize: 13, fontWeight: 'bold', color: colors.primary.dark },

  // List
  listContainer: {
    backgroundColor: colors.light.dark, borderRadius: 10, padding: 16, marginTop: 8,
  },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  listTitle:  { color: colors.primary.dark, fontWeight: 'bold', fontSize: 16 },
  listItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    paddingHorizontal: 8, borderRadius: 8, marginBottom: 6,
    backgroundColor: colors.light.main,
  },
  listIdx:   { color: colors.primary.light, width: 22, fontSize: 12 },
  listName:  { color: colors.primary.dark, fontWeight: 'bold', fontSize: 14 },
  listSub:   { color: colors.primary.main, fontSize: 11, marginTop: 1 },
  listPrice: { fontSize: 13, fontWeight: 'bold', color: colors.primary.dark },
  statusBadge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  statusBadgeTxt: { fontSize: 9, fontWeight: 'bold', color: '#fff' },
  emptyText: { textAlign: 'center', color: colors.primary.main, marginTop: 24 },

  // Details
  detailsCard: {
    backgroundColor: colors.light.dark, borderRadius: 10, padding: 24,
    alignItems: 'center', marginTop: 16,
  },
  detailsClient:  { fontSize: 20, fontWeight: 'bold', color: colors.primary.dark, textAlign: 'center' },
  detailsAddress: { fontSize: 12, color: colors.primary.main, textAlign: 'center', marginBottom: 20 },
  detailsTotal:   { fontSize: 28, fontWeight: 'bold', color: colors.primary.dark, marginBottom: 16 },
  detailsItem:    { color: colors.primary.main, fontSize: 14, marginBottom: 4 },
  detailsDates:   { color: colors.primary.main, fontSize: 12, marginTop: 16 },

  // Receipt block
  receiptBlock: {
    width: '100%', marginTop: 20, padding: 14, borderRadius: 10,
    borderWidth: 1,
  },
  receiptRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  receiptTitle: { fontSize: 14, fontWeight: 'bold' },
  receiptDetail:{ fontSize: 13, color: colors.primary.dark, marginBottom: 2 },

  // Edit
  cartContainer:  { marginTop: 16, padding: 16, backgroundColor: colors.light.dark, borderRadius: 8 },
  editCartItem:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cartItemText:   { fontSize: 14, color: colors.primary.dark, fontWeight: 'bold' },
  cartItemRemove: { fontSize: 12, color: colors.primary.main, textDecorationLine: 'underline' },
  cartTotalText:  { fontSize: 16, color: colors.primary.dark, fontWeight: 'bold', marginTop: 12 },

  // Bottom sheet overlay (receipt)
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },

  // Receipt sheet modal
  receiptSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  receiptSheetTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary.dark, textAlign: 'center', marginBottom: 2 },
  receiptSheetSub:   { fontSize: 13, color: colors.primary.main, textAlign: 'center', marginBottom: 16 },
  receiptSheetLabel: { fontSize: 11, fontWeight: 'bold', color: colors.primary.main, textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  receiptDateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.light.main, borderRadius: 10, padding: 14, marginBottom: 4,
  },
  receiptDateBtnTxt: { fontSize: 16, fontWeight: '600', color: colors.primary.dark },
  receiptAmountInput: {
    backgroundColor: colors.light.main, borderRadius: 10, padding: 14,
    fontSize: 26, fontWeight: 'bold', color: colors.primary.dark,
    textAlign: 'center', marginBottom: 16,
  },

  // Modal (selector)
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent:  { backgroundColor: colors.light.main, borderRadius: 8, padding: 24, maxHeight: '80%' },
  modalTitle:    { fontSize: 20, fontWeight: 'bold', color: colors.primary.dark, marginBottom: 16, textAlign: 'center' },
  modalItem:     { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.light.dark },
  modalItemText: { fontSize: 16, color: colors.primary.main },
  modalEmpty:    { textAlign: 'center', color: colors.primary.main, marginVertical: 16 },
});
