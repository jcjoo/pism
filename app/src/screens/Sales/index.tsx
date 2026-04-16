import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Input, Button, QuantitySelector, Select } from '@/components';
import { colors, typography } from '@/theme';

// Services
import { clientsService, Client } from '@/services/clients.service';
import { productsService, Product } from '@/services/products.service';
import { salesService, SaleFilters } from '@/services/sales.service';

type Step = 'filter' | 'list' | 'details' | 'edit';

export function Sales() {
  const [step, setStep] = useState<Step>('filter');
  const [loading, setLoading] = useState(false);

  // Data for Selectors
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);

  // Filters
  const [filterClient, setFilterClient] = useState<Client | null>(null);
  const [filterProduct, setFilterProduct] = useState<Product | null>(null);

  const [dateFieldTarget, setDateFieldTarget] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const [dueStart, setDueStart] = useState<Date | null>(null);
  const [dueEnd, setDueEnd] = useState<Date | null>(null);

  // Results
  const [salesData, setSalesData] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  // Edit State
  const [editCart, setEditCart] = useState<any[]>([]);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setQuantity] = useState(1);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editDueDate, setEditDueDate] = useState<Date | null>(new Date());
  const [editPaymentMode, setEditPaymentMode] = useState('À vista');

  // Modal selector state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'cliente' | 'product'>('cliente');

  useEffect(() => {
    const loadData = async () => {
      try {
        const cData = await clientsService.getAll();
        setClientsList(cData);

        const pData = await productsService.getAll();
        setProductsList(pData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  const handleFetchSales = async () => {
    setLoading(true);
    try {
      const filters: SaleFilters = {
        clientId: filterClient?.id,
        dateStart: dateStart?.toISOString(),
        dateEnd: dateEnd?.toISOString(),
        dueStart: dueStart?.toISOString(),
        dueEnd: dueEnd?.toISOString(),
      };

      const data = await salesService.getSales(filters);

      let results = data || [];

      if (filterProduct) {
        results = results.filter(sale =>
          sale.sale_items.some((item: any) => item.product_id === filterProduct.id)
        );
      }

      setSalesData(results);
      setStep('list');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (sale: any) => {
    setSelectedSale(sale);
    setStep('details');
  };

  const startEdit = () => {
    // Populate edit state
    setEditCart(selectedSale.sale_items.map((si: any) => ({
      id: si.id,
      product: si.products,
      quantity: si.quantity,
      price: si.price
    })));
    setEditDueDate(new Date(selectedSale.dueDate));
    setEditPaymentMode(selectedSale.payment === 'cash' ? 'À vista' : `${selectedSale.installments}x`);
    setStep('edit');
  };

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
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const handleSaveEdit = async () => {
    // For simplicity, similar logic could update sales items.
    Alert.alert('Simulação', 'Fluxo de salvar edição a ser finalizado conforme a API suportar UPSERT.');
    setStep('details'); // return to details mock
  };

  const formatDate = (d: Date | null | string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('pt-BR');
  };

  const renderPrice = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  const calculateTotal = (items: any[]) => items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const selectModalItem = (item: any) => {
    if (modalType === 'cliente') {
      if (step === 'filter') setFilterClient(item);
    } else {
      if (step === 'filter') setFilterProduct(item);
      else {
        setEditProduct(item);
        setEditPrice(item.price ? item.price.toString() : '');
      }
    }
    setModalVisible(false);
  };

  const switchEditPaymentMode = () => {
    setEditPaymentMode(prev => prev === 'À vista' ? '2x' : prev === '2x' ? '3x' : 'À vista');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* STEP 1: FILTER */}
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
              <Select label="Data Venda" value={formatDate(dateStart)} onPress={() => { setDateFieldTarget('dateStart'); setShowDatePicker(true); }} style={styles.flexItem} />
              <View style={{ width: 8 }} />
              <Select label="Data Venda" value={formatDate(dateEnd)} onPress={() => { setDateFieldTarget('dateEnd'); setShowDatePicker(true); }} style={styles.flexItem} />
            </View>

            <View style={styles.row}>
              <Select label="Data Venc." value={formatDate(dueStart)} onPress={() => { setDateFieldTarget('dueStart'); setShowDatePicker(true); }} style={styles.flexItem} />
              <View style={{ width: 8 }} />
              <Select label="Data Venc." value={formatDate(dueEnd)} onPress={() => { setDateFieldTarget('dueEnd'); setShowDatePicker(true); }} style={styles.flexItem} />
            </View>

            <View style={[styles.row, { marginTop: 16 }]}>
              <Button title="Limpar" variant="primary-dark" style={styles.flexItem} onPress={() => {
                setFilterClient(null); setFilterProduct(null); setDateStart(null); setDateEnd(null); setDueStart(null); setDueEnd(null);
              }} />
              <View style={{ width: 8 }} />
              <Button title={loading ? "Buscando..." : "Consultar"} variant="secondary" style={styles.flexItem} onPress={handleFetchSales} disabled={loading} />
            </View>
          </View>
        )}

        {/* STEP 2: LIST RESULTS */}
        {step === 'list' && (
          <View>
            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Vendas ({salesData.length})</Text>
                <Feather name="chevron-up" size={20} color={colors.primary.dark} />
              </View>
              {salesData.length === 0 ? (
                <Text style={styles.emptyText}>Nenhuma venda encontrada.</Text>
              ) : (
                salesData.map((sale, idx) => (
                  <TouchableOpacity key={sale.id} style={styles.listItem} onPress={() => handleItemPress(sale)}>
                    <Text style={styles.listIdx}>{idx + 1}</Text>
                    <Text style={styles.listName} numberOfLines={1}>{sale.clients?.name || 'Cliente deletado'}</Text>
                    <Text style={styles.listDate}>{formatDate(sale.created_at)}</Text>
                    <Text style={styles.listPrice}>{renderPrice(calculateTotal(sale.sale_items))}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={[styles.row, { marginTop: 16 }]}>
              <Button title="Voltar" variant="primary-dark" style={styles.flexItem} onPress={() => setStep('filter')} />
              <Button title="Nova Busca" variant="secondary" style={styles.flexItem} onPress={() => setStep('filter')} />
            </View>
          </View>
        )}

        {/* STEP 3: DETAILS */}
        {step === 'details' && selectedSale && (
          <View>
            <View style={styles.detailsCard}>
              <Text style={styles.detailsClient}>{selectedSale.clients?.name}</Text>
              <Text style={styles.detailsAddress}>{selectedSale.clients?.address}, {selectedSale.clients?.city}</Text>

              <Text style={styles.detailsTotal}>{renderPrice(calculateTotal(selectedSale.sale_items))}</Text>

              {selectedSale.sale_items.map((item: any) => (
                <Text key={item.id} style={styles.detailsItem}>
                  ({item.quantity}x) {item.products?.name} - {renderPrice(item.price)}
                </Text>
              ))}

              <Text style={styles.detailsDates}>Data compra: {formatDate(selectedSale.created_at)}</Text>
              <Text style={[styles.detailsDates, { marginBottom: 0 }]}>Data vencimento: {formatDate(selectedSale.dueDate)}</Text>
            </View>

            <View style={[styles.row, { marginTop: 16 }]}>
              <Button title="Voltar" variant="primary" style={styles.flexItem} onPress={() => setStep('list')} />
              <View style={{ width: 8 }} />
              <Button title="Editar" variant="primary-dark" style={styles.flexItem} onPress={startEdit} />
            </View>
          </View>
        )}

        {/* STEP 4: EDIT */}
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
                Total: {renderPrice(calculateTotal(editCart))}
              </Text>
            </View>

            <View style={[styles.row, { marginTop: 16 }]}>
              <Select
                label="Data venc."
                value={formatDate(editDueDate)}
                onPress={() => { setDateFieldTarget('editDueDate'); setShowDatePicker(true); }}
                style={styles.flexItem}
              />
              <View style={{ width: 8 }} />
              <QuantitySelector
                label={editPaymentMode}
                value={0}
                onChange={switchEditPaymentMode}
              />
            </View>

            <Input placeholder="Observação..." multiline style={{ minHeight: 64, marginTop: 4 }} />

            <View style={[styles.row, { marginTop: 8 }]}>
              <Button title="Cancelar" variant="primary-dark" style={styles.flexItem} onPress={() => setStep('details')} />
              <View style={{ width: 8 }} />
              <Button title="Salvar" variant="secondary" style={styles.flexItem} onPress={handleSaveEdit} />
            </View>

            <Button title={loading ? "Apagando..." : "Apagar Venda"} variant="danger" onPress={handleDelete} disabled={loading} style={{ marginTop: 8 }} />
          </View>
        )}

      </ScrollView>

      {/* Shared Modals */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              if (dateFieldTarget === 'dateStart') setDateStart(selectedDate);
              else if (dateFieldTarget === 'dateEnd') setDateEnd(selectedDate);
              else if (dateFieldTarget === 'dueStart') setDueStart(selectedDate);
              else if (dateFieldTarget === 'dueEnd') setDueEnd(selectedDate);
              else if (dateFieldTarget === 'editDueDate') setEditDueDate(selectedDate);
            }
          }}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Selecione o {modalType === 'cliente' ? 'Cliente' : 'Produto'}
            </Text>
            <FlatList
              data={
                modalType === 'cliente'
                  ? [{ id: 'none', name: 'Todos os Clientes' } as any, ...clientsList]
                  : [{ id: 'none', name: 'Todas as Mercadorias' } as any, ...productsList]
              }
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => selectModalItem(item.id === 'none' ? null : item)}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>Nenhum item encontrado.</Text>}
            />
            <Button title="Fechar" onPress={() => setModalVisible(false)} variant="primary" />
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.main },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  flexItem: { flex: 1 },
  listContainer: { backgroundColor: colors.light.dark, borderRadius: 8, padding: 16, marginTop: 16 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  listTitle: { color: colors.primary.dark, fontWeight: 'bold', fontSize: 16 },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.light.main },
  listIdx: { color: colors.primary.main, width: 20 },
  listName: { color: colors.primary.dark, flex: 1, marginRight: 8 },
  listDate: { color: colors.primary.main, fontSize: 12, marginRight: 8 },
  listPrice: { color: colors.primary.main, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: colors.primary.main, marginTop: 24 },
  detailsCard: { backgroundColor: colors.light.dark, borderRadius: 8, padding: 24, alignItems: 'center', marginTop: 16 },
  detailsClient: { fontSize: 20, fontWeight: 'bold', color: colors.primary.dark, textAlign: 'center' },
  detailsAddress: { fontSize: 12, color: colors.primary.dark, textAlign: 'center', marginBottom: 24 },
  detailsTotal: { fontSize: 24, fontWeight: 'bold', color: colors.primary.dark, marginBottom: 24 },
  detailsItem: { color: colors.primary.main, fontSize: 14, marginBottom: 4 },
  detailsDates: { color: colors.primary.main, fontSize: 12, marginTop: 24 },
  cartContainer: { marginTop: 16, padding: 16, backgroundColor: colors.light.dark, borderRadius: 8 },
  editCartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cartItemText: { fontSize: 14, color: colors.primary.dark, fontWeight: 'bold' },
  cartItemRemove: { fontSize: 12, color: colors.primary.main, textDecorationLine: 'underline' },
  cartTotalText: { fontSize: 16, color: colors.primary.dark, fontWeight: 'bold', marginTop: 12, marginBottom: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: colors.light.main, borderRadius: 8, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary.dark, marginBottom: 16, textAlign: 'center' },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.light.dark },
  modalItemText: { fontSize: 16, color: colors.primary.main },
  modalEmpty: { textAlign: 'center', color: colors.primary.main, marginVertical: 16 }
});
