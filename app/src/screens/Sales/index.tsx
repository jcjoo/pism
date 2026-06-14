import React, { useState, useEffect } from 'react';
import {
  View, Text, KeyboardAvoidingView,
  Platform, TouchableOpacity, Modal, FlatList, TextInput,
} from 'react-native';
import { FormScrollView } from '@/components';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Input, Button, QuantitySelector, Select, useToast, useConfirm } from '@/components';

import { clientsService, Client } from '@/services/clients.service';
import { productsService, Product } from '@/services/products.service';
import { salesService, SaleFilters } from '@/services/sales.service';
import { recebimentosService } from '@/services/recebimentos.service';

type Step = 'filter' | 'list' | 'details' | 'edit';
type StatusFilter = 'all' | 'pending' | 'received';

const renderPrice = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;
const formatDate  = (d: Date | null | string) => d ? new Date(d).toLocaleDateString('pt-BR') : '';
const calcTotal   = (items: any[]) => items.reduce((a, i) => a + i.price * i.quantity, 0);

const getDaysUntilDue = (dueDate: string) => {
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const now = new Date();        now.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / 86400000);
};

type DueStatus = 'received' | 'overdue' | 'today' | 'soon' | 'ok';

function getDueStatus(sale: any): DueStatus {
  if (sale.received_at) return 'received';
  const d = getDaysUntilDue(sale.dueDate);
  if (d < 0)   return 'overdue';
  if (d === 0) return 'today';
  if (d <= 5)  return 'soon';
  return 'ok';
}

const STATUS_CONFIG: Record<DueStatus, { label: string; color: string; bg: string }> = {
  received: { label: 'Recebido',       color: '#1B8A3D', bg: '#E6F7EC' },
  overdue:  { label: 'Atrasado',       color: '#DF1515', bg: '#FFF0F0' },
  today:    { label: 'Vence hoje',     color: '#B86E00', bg: '#FFF8E6' },
  soon:     { label: 'Vence em breve', color: '#758C36', bg: '#F6FBEA' },
  ok:       { label: 'A receber',      color: '#5A189A', bg: '#EAE3F0' },
};

export function Sales() {
  const toast = useToast();
  const confirm = useConfirm();
  const [step, setStep] = useState<Step>('filter');
  const [loading, setLoading] = useState(false);

  const [clientsList,  setClientsList]  = useState<Client[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);

  const [filterClient,  setFilterClient]  = useState<Client | null>(null);
  const [filterProduct, setFilterProduct] = useState<Product | null>(null);
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('all');

  const [dateFieldTarget, setDateFieldTarget] = useState<string | null>(null);
  const [showDatePicker,  setShowDatePicker]  = useState(false);
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd,   setDateEnd]   = useState<Date | null>(null);
  const [dueStart,  setDueStart]  = useState<Date | null>(null);
  const [dueEnd,    setDueEnd]    = useState<Date | null>(null);

  const [salesData,    setSalesData]    = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  const [editCart,        setEditCart]        = useState<any[]>([]);
  const [editDueDate,     setEditDueDate]     = useState<Date | null>(new Date());
  const [editPaymentMode, setEditPaymentMode] = useState('À vista');
  const [editObservation, setEditObservation] = useState('');

  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [receiptDate,         setReceiptDate]         = useState(new Date());
  const [receiptAmount,       setReceiptAmount]       = useState('');
  const [savingReceipt,       setSavingReceipt]       = useState(false);

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
      toast.show(e.message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Apagar Venda',
      message: 'Deseja apagar esta venda?',
      confirmText: 'Apagar',
      destructive: true,
    });
    if (!ok) return;
    setLoading(true);
    try {
      await salesService.delete(selectedSale.id);
      toast.show('Venda apagada!', { type: 'success' });
      setStep('filter');
      setSalesData([]);
    } catch (e: any) {
      toast.show(e.message, { type: 'error' });
    } finally { setLoading(false); }
  };

  const startEdit = () => {
    setEditCart(selectedSale.sale_items.map((si: any) => ({
      id: si.id, product: si.products, quantity: si.quantity, price: si.price,
    })));
    setEditDueDate(new Date(selectedSale.dueDate));
    setEditPaymentMode(selectedSale.payment === 'cash' ? 'À vista' : `${selectedSale.installments}x`);
    setEditObservation(selectedSale.observation ?? '');
    setStep('edit');
  };

  const handleSaveEdit = async () => {
    toast.show('Fluxo de salvar a ser finalizado.', { type: 'info' });
    setStep('details');
  };

  const switchPayment = () =>
    setEditPaymentMode(p => p === 'À vista' ? '2x' : p === '2x' ? '3x' : 'À vista');

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
    if (isNaN(num) || num <= 0) { toast.show('Valor inválido.', { type: 'error' }); return; }
    setSavingReceipt(true);
    try {
      await recebimentosService.updateReceived(selectedSale.id, receiptDate.toISOString(), num);
      const updated = { ...selectedSale, received_at: receiptDate.toISOString(), received_amount: num };
      setSelectedSale(updated);
      setSalesData(p => p.map(s => s.id === updated.id ? updated : s));
      setReceiptModalVisible(false);
    } catch (e: any) { toast.show(e.message, { type: 'error' }); }
    finally { setSavingReceipt(false); }
  };

  const handleRemoveReceipt = async () => {
    const ok = await confirm({
      title: 'Remover recebimento',
      message: 'Deseja desfazer este recebimento?',
      confirmText: 'Remover',
      destructive: true,
    });
    if (!ok) return;
    setSavingReceipt(true);
    try {
      await recebimentosService.removeReceived(selectedSale.id);
      const updated = { ...selectedSale, received_at: null, received_amount: null };
      setSelectedSale(updated);
      setSalesData(p => p.map(s => s.id === updated.id ? updated : s));
    } catch (e: any) { toast.show(e.message, { type: 'error' }); }
    finally { setSavingReceipt(false); }
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

  const totalAll      = salesData.reduce((a, s) => a + calcTotal(s.sale_items), 0);
  const totalReceived = salesData.filter(s => s.received_at)
    .reduce((a, s) => a + (s.received_amount ?? calcTotal(s.sale_items)), 0);
  const totalPending  = salesData.filter(s => !s.received_at)
    .reduce((a, s) => a + calcTotal(s.sale_items), 0);

  const StatusChip = ({ label, val }: { label: string; val: StatusFilter }) => (
    <TouchableOpacity
      onPress={() => setStatusFilter(val)}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: statusFilter === val ? '#3C096C' : '#E1DAE8',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: statusFilter === val ? '#fff' : '#3C096C' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="screen">
      <FormScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}>

        {/* FILTER */}
        {step === 'filter' && (
          <View>
            {/* Seção: Cliente e Mercadoria */}
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

            {/* Seção: Período */}
            <Text className="label-upper mt-3">Período da Venda</Text>
            <View className="flex-row items-center">
              <Select label="De" value={formatDate(dateStart)} placeholder="—" onPress={() => { setDateFieldTarget('dateStart'); setShowDatePicker(true); }} className="flex-1" />
              <View className="w-2" />
              <Select label="Até" value={formatDate(dateEnd)} placeholder="—" onPress={() => { setDateFieldTarget('dateEnd'); setShowDatePicker(true); }} className="flex-1" />
            </View>

            <Text className="label-upper mt-2">Período de Vencimento</Text>
            <View className="flex-row items-center">
              <Select label="De" value={formatDate(dueStart)} placeholder="—" onPress={() => { setDateFieldTarget('dueStart'); setShowDatePicker(true); }} className="flex-1" />
              <View className="w-2" />
              <Select label="Até" value={formatDate(dueEnd)} placeholder="—" onPress={() => { setDateFieldTarget('dueEnd'); setShowDatePicker(true); }} className="flex-1" />
            </View>

            {/* Seção: Status */}
            <Text className="label-upper mt-3">Status do recebimento</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              <StatusChip label="Todos" val="all" />
              <StatusChip label="A receber" val="pending" />
              <StatusChip label="Recebidos" val="received" />
            </View>

            <View className="flex-row items-center my-1 mt-4">
              <Button title="Limpar" variant="primary-dark" className="flex-1" onPress={() => {
                setFilterClient(null); setFilterProduct(null);
                setDateStart(null); setDateEnd(null); setDueStart(null); setDueEnd(null);
                setStatusFilter('all');
              }} />
              <View className="w-2" />
              <Button
                title={loading ? 'Buscando...' : 'Consultar'}
                variant="secondary"
                className="flex-1"
                onPress={handleFetchSales}
                disabled={loading}
                icon={loading ? undefined : <Feather name="search" size={15} color="#0E0F0C" />}
              />
            </View>
          </View>
        )}

        {/* LIST */}
        {step === 'list' && (
          <View>
            {/* Cards de resumo */}
            <View className="flex-row gap-2 mt-4 mb-3">
              <View className="flex-1 bg-white rounded-xl p-3 border-l-[3px] border-l-primary" style={{ elevation: 2, shadowColor: '#3C096C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 }}>
                <Feather name="dollar-sign" size={12} color="#5A189A" />
                <Text className="text-[10px] text-primary font-semibold mt-1">Total</Text>
                <Text className="text-[13px] font-bold text-primary-dark mt-0.5">{renderPrice(totalAll)}</Text>
              </View>
              <View className="flex-1 bg-white rounded-xl p-3 border-l-[3px] border-l-[#1B8A3D]" style={{ elevation: 2, shadowColor: '#1B8A3D', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 }}>
                <Feather name="check-circle" size={12} color="#1B8A3D" />
                <Text className="text-[10px] text-primary font-semibold mt-1">Recebido</Text>
                <Text className="text-[13px] font-bold text-[#1B8A3D] mt-0.5">{renderPrice(totalReceived)}</Text>
              </View>
              <View className="flex-1 bg-white rounded-xl p-3 border-l-[3px] border-l-danger" style={{ elevation: 2, shadowColor: '#DF1515', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 }}>
                <Feather name="clock" size={12} color="#DF1515" />
                <Text className="text-[10px] text-primary font-semibold mt-1">A receber</Text>
                <Text className="text-[13px] font-bold text-danger mt-0.5">{renderPrice(totalPending)}</Text>
              </View>
            </View>

            {/* Lista de vendas */}
            <View className="bg-light-dark rounded-xl p-4">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-primary-dark font-bold text-base">
                  {salesData.length} venda{salesData.length !== 1 ? 's' : ''}
                </Text>
                <Feather name="list" size={18} color="#3C096C" />
              </View>

              {salesData.length === 0 ? (
                <Text className="text-center text-primary my-6">Nenhuma venda encontrada.</Text>
              ) : (
                salesData.map((sale, idx) => {
                  const st  = getDueStatus(sale);
                  const cfg = STATUS_CONFIG[st];
                  const days = sale.received_at ? null : getDaysUntilDue(sale.dueDate);
                  return (
                    <TouchableOpacity
                      key={sale.id}
                      className="flex-row items-center py-3 px-2.5 rounded-xl mb-2 bg-light"
                      style={{ elevation: 1, shadowColor: '#3C096C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 }}
                      onPress={() => { setSelectedSale(sale); setStep('details'); }}
                    >
                      <View
                        className="w-1 self-stretch rounded-full mr-2.5"
                        style={{ backgroundColor: cfg.color, minHeight: 36 }}
                      />
                      <View className="flex-1 mr-2">
                        <Text className="text-primary-dark font-bold text-sm" numberOfLines={1}>
                          {sale.clients?.name || 'Cliente deletado'}
                        </Text>
                        <Text className="text-primary text-[11px] mt-0.5" numberOfLines={1}>
                          {formatDate(sale.created_at)}
                          {days !== null && days < 0 && ` · ${Math.abs(days)}d atraso`}
                          {days === 0 && ' · Vence hoje'}
                        </Text>
                      </View>
                      <View className="items-end gap-1">
                        <Text className="text-[13px] font-bold text-primary-dark">
                          {renderPrice(calcTotal(sale.sale_items))}
                        </Text>
                        <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg }}>
                          <Text className="text-[9px] font-bold" style={{ color: cfg.color }}>{cfg.label}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <View className="flex-row items-center my-1 mt-4">
              <Button title="Voltar" variant="primary-dark" className="flex-1" onPress={() => setStep('filter')} />
              <View className="w-2" />
              <Button title="Nova Busca" variant="secondary" className="flex-1" onPress={() => { setStep('filter'); setSalesData([]); }} />
            </View>
          </View>
        )}

        {/* DETAILS */}
        {step === 'details' && selectedSale && (() => {
          const st  = getDueStatus(selectedSale);
          const cfg = STATUS_CONFIG[st];
          const days = selectedSale.received_at ? null : getDaysUntilDue(selectedSale.dueDate);
          const total = calcTotal(selectedSale.sale_items);
          return (
            <View>
              <View
                className="bg-light-dark rounded-[10px] p-6 items-center mt-4"
                style={{ borderTopWidth: 4, borderTopColor: cfg.color }}
              >
                <Text className="text-xl font-bold text-primary-dark text-center">
                  {selectedSale.clients?.name}
                </Text>
                <Text className="text-xs text-primary text-center mb-5">
                  {selectedSale.clients?.address}
                </Text>

                <Text className="text-[28px] font-bold text-primary-dark mb-4">
                  {renderPrice(total)}
                </Text>

                {selectedSale.sale_items.map((item: any) => (
                  <Text key={item.id} className="text-primary text-sm mb-1">
                    ({item.quantity}x) {item.products?.name} — {renderPrice(item.price)}
                  </Text>
                ))}

                <Text className="text-primary text-xs mt-4">Data compra: {formatDate(selectedSale.created_at)}</Text>
                <Text className="text-primary text-xs mt-1">Vencimento: {formatDate(selectedSale.dueDate)}</Text>

                {selectedSale.observation ? (
                  <View className="w-full mt-4 p-3 rounded-[10px] bg-white border border-light-dark">
                    <Text className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1">Observação</Text>
                    <Text className="text-sm text-primary-dark">{selectedSale.observation}</Text>
                  </View>
                ) : null}

                <View
                  className="w-full mt-5 p-3.5 rounded-[10px] border"
                  style={{ backgroundColor: cfg.bg, borderColor: cfg.color }}
                >
                  {selectedSale.received_at ? (
                    <>
                      <View className="flex-row items-center gap-2 mb-1.5">
                        <Feather name="check-circle" size={16} color={cfg.color} />
                        <Text className="text-sm font-bold" style={{ color: cfg.color }}>Recebido</Text>
                      </View>
                      <Text className="text-[13px] text-primary-dark mb-0.5">
                        Em: {formatDate(selectedSale.received_at)}
                      </Text>
                      <Text className="text-[13px] text-primary-dark mb-0.5">
                        Valor: {renderPrice(selectedSale.received_amount ?? total)}
                      </Text>
                      {selectedSale.received_amount != null &&
                        Math.abs(selectedSale.received_amount - total) > 0.01 && (
                          <Text className="text-[13px] text-danger mb-0.5">
                            Diferença: {renderPrice(selectedSale.received_amount - total)}
                          </Text>
                        )}
                      <View className="flex-row items-center mt-2.5">
                        <Button
                          title="Editar recebimento"
                          variant="primary-light"
                          className="flex-1"
                          onPress={openEditReceipt}
                          icon={<Feather name="edit-2" size={14} color="#fff" />}
                        />
                        <View className="w-2" />
                        <Button
                          title="Remover"
                          variant="danger"
                          onPress={handleRemoveReceipt}
                          disabled={savingReceipt}
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <View className="flex-row items-center gap-2 mb-1.5">
                        <Feather name="clock" size={16} color={cfg.color} />
                        <Text className="text-sm font-bold" style={{ color: cfg.color }}>
                          {st === 'overdue'
                            ? `Atrasado ${Math.abs(days!)} dia${Math.abs(days!) > 1 ? 's' : ''}`
                            : st === 'today'
                            ? 'Vence hoje'
                            : `Vence em ${days} dia${days! > 1 ? 's' : ''}`}
                        </Text>
                      </View>
                      <Text className="text-[13px] text-primary-dark">Aguardando recebimento</Text>
                      <Button
                        title="Marcar como recebido"
                        variant="secondary"
                        className="mt-2.5"
                        onPress={handleMarkReceived}
                        icon={<Feather name="check" size={14} color="#0E0F0C" />}
                      />
                    </>
                  )}
                </View>
              </View>

              <View className="flex-row items-center my-1 mt-4">
                <Button title="Voltar" variant="primary" className="flex-1" onPress={() => setStep('list')} />
                <View className="w-2" />
                <Button title="Editar" variant="primary-dark" className="flex-1" onPress={startEdit} />
              </View>
            </View>
          );
        })()}

        {/* EDIT */}
        {step === 'edit' && selectedSale && (
          <View>
            <Select label="Cliente" value={selectedSale.clients?.name} disabled />

            <View className="mt-4 p-4 bg-light-dark rounded-lg">
              {editCart.map((item, idx) => (
                <View key={idx} className="flex-row justify-between items-center mb-3">
                  <Text className="text-sm text-primary-dark font-bold">
                    {idx + 1}. {item.product?.name} ({item.quantity}x) – {renderPrice(item.price * item.quantity)}
                  </Text>
                  <TouchableOpacity onPress={() => setEditCart(editCart.filter((_, i) => i !== idx))}>
                    <Text className="text-xs text-primary underline">Remover</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <Text className="text-base text-primary-dark font-bold mt-3">
                Total: {renderPrice(calcTotal(editCart))}
              </Text>
            </View>

            <View className="flex-row items-center my-1 mt-4">
              <Select
                label="Data venc."
                value={formatDate(editDueDate)}
                onPress={() => { setDateFieldTarget('editDueDate'); setShowDatePicker(true); }}
                className="flex-1"
              />
              <View className="w-2" />
              <QuantitySelector label="Pagamento" displayText={editPaymentMode} value={0} onChange={switchPayment} />
            </View>

            <Input
              placeholder="Observação (opcional)..."
              value={editObservation}
              onChangeText={setEditObservation}
              multiline
              style={{ minHeight: 64, marginTop: 4 }}
            />

            <View className="flex-row items-center my-1 mt-2">
              <Button title="Cancelar" variant="primary-dark" className="flex-1" onPress={() => setStep('details')} />
              <View className="w-2" />
              <Button title="Salvar" variant="secondary" className="flex-1" onPress={handleSaveEdit} />
            </View>

            <Button
              title={loading ? 'Apagando...' : 'Apagar Venda'}
              variant="danger"
              onPress={handleDelete}
              disabled={loading}
              className="mt-2"
            />
          </View>
        )}

      </FormScrollView>

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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
            activeOpacity={1}
            onPress={() => !savingReceipt && setReceiptModalVisible(false)}
          />
          <TouchableOpacity activeOpacity={1} className="modal-sheet-bottom">
            <Text className="text-lg font-bold text-primary-dark text-center mb-0.5">
              {selectedSale?.received_at ? 'Editar Recebimento' : 'Marcar como Recebido'}
            </Text>
            {selectedSale && (
              <Text className="text-[13px] text-primary text-center mb-4">{selectedSale.clients?.name}</Text>
            )}

            <Text className="label-upper mt-3">
              Data do recebimento
            </Text>
            <TouchableOpacity
              className="flex-row items-center gap-2 bg-light rounded-[10px] p-3.5 mb-1"
              onPress={() => { setDateFieldTarget('receiptDate'); setShowDatePicker(true); }}
            >
              <Feather name="calendar" size={16} color="#3C096C" />
              <Text className="text-base font-semibold text-primary-dark">{formatDate(receiptDate)}</Text>
            </TouchableOpacity>

            <Text className="label-upper mt-3">
              Valor recebido (R$)
            </Text>
            <TextInput
              className="amount-input text-[26px]"
              value={receiptAmount}
              onChangeText={setReceiptAmount}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />

            <View className="flex-row items-center">
              <Button
                title="Cancelar"
                variant="primary-dark"
                className="flex-1"
                onPress={() => setReceiptModalVisible(false)}
                disabled={savingReceipt}
              />
              <View className="w-2" />
              <Button
                title={savingReceipt ? 'Salvando...' : 'Confirmar'}
                variant="secondary"
                className="flex-[1.5]"
                onPress={handleSaveReceipt}
                disabled={savingReceipt}
              />
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Selector modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="modal-overlay-center">
          <View className="modal-panel-center">
            <Text className="modal-title">
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
                  className="modal-item"
                  onPress={() => selectModalItem(item.id === 'none' ? null : item)}
                >
                  <Text className="text-base text-primary">{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text className="empty-text">Nenhum item.</Text>
              }
            />
            <Button title="Fechar" onPress={() => setModalVisible(false)} variant="primary" />
          </View>
        </View>
      </Modal>
    </View>
  );
}
