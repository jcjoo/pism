import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Input, Button, QuantitySelector, Select } from '@/components';
import { colors, typography } from '@/theme';
import { useAuth } from '@/hooks/useAuth';

// Services
import { clientsService, Client } from '@/services/clients.service';
import { productsService, Product } from '@/services/products.service';
import { salesService } from '@/services/sales.service';

export function NewSale() {
  const { userId } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<{ product: Product; quantity: number; price: number }[]>([]);

  // Supabase Data
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);

  // Modal selector state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'cliente' | 'product'>('cliente');

  // Payment configs
  const [dueDate, setDueDate] = useState<Date | null>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentMode, setPaymentMode] = useState('À vista');
  const [observation, setObservation] = useState('');

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

  const openClientSelect = () => {
    setModalType('cliente');
    setModalVisible(true);
  };

  const openProductSelect = () => {
    setModalType('product');
    setModalVisible(true);
  };

  const selectItem = (item: any) => {
    if (modalType === 'cliente') {
      setClient(item);
    } else {
      setProduct(item);
      setPrice(item.price ? item.price.toString() : '');
    }
    setModalVisible(false);
  };

  const handleAddToCart = () => {
    if (!product || !price) return;
    const itemPrice = parseFloat(price.replace(',', '.'));

    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(item => item.product.id === product.id);
      if (existingItemIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + quantity
        };
        return newCart;
      }
      return [...prevCart, { product, quantity, price: itemPrice }];
    });

    setProduct(null);
    setPrice('');
    setQuantity(1);
  };

  const currentTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const renderPrice = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  const [loading, setLoading] = useState(false);

  const switchPaymentMode = () => {
    setPaymentMode(prev => prev === 'À vista' ? '2x' : prev === '2x' ? '3x' : 'À vista');
  };

  const handleRegisterSale = async () => {
    if (!client) {
      alert('Por favor, selecione um Cliente primeiro!');
      return;
    }
    if (cart.length === 0) {
      alert('O carrinho está vazio!');
      return;
    }
    if (!dueDate) return;

    setLoading(true);
    try {
      if (!userId) throw new Error('Usuário não autenticado');

      const isCash = paymentMode === 'À vista';

      // Criar Venda Principal e Itens usando o service
      await salesService.create(
        {
          clientId: client.id,
          dueDate: dueDate.toISOString(),
          payment: isCash ? 'cash' : 'installments',
          installments: isCash ? null : parseInt(paymentMode.replace('x', '')),
          user_id: userId,
        },
        cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.price,
          user_id: userId,
        }))
      );

      alert('Venda registrada com sucesso! ✅');

      // Reset da tela de venda
      setClient(null);
      setCart([]);
      setPaymentMode('À vista');
      setObservation('');
      setDueDate(new Date());

    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Step 1: Client Selection */}
        <Select
          label="Cliente"
          value={client?.name || ''}
          placeholder="Selecione um Cliente"
          onPress={openClientSelect}
        />

        {/* Step 2: Product Selection */}
        <Select
          label="Mercadoria"
          placeholder={product ? product.name : "Selecione uma Mercadoria"}
          value={product?.name || ''}
          onPress={openProductSelect}
        />

        {/* Step 3: Product Pricing & Adding */}
        {product ? (
          <>
            <View style={styles.row}>
              <Input
                placeholder="Valor (R$)"
                value={price}
                onChangeText={setPrice}
                style={styles.flexItemPrice}
                keyboardType="decimal-pad"
              />
              <View style={{ width: 8 }} />
              <QuantitySelector
                label="Quantidade"
                value={quantity}
                onChange={setQuantity}
              />
            </View>

            <View style={styles.row}>
              <Button
                title="Remover"
                variant="primary"
                style={styles.flexItem}
                onPress={() => { setProduct(null); setPrice(''); }}
              />
              <View style={{ width: 8 }} />
              <Button
                title="Adicionar"
                variant="primary-dark"
                style={styles.flexItem}
                onPress={handleAddToCart}
              />
            </View>
          </>
        ) : null}

        {/* Step 4: Cart details */}
        {cart.length > 0 && (
          <View style={styles.cartContainer}>
            {cart.map((item, idx) => (
              <View key={idx} style={styles.cartItem}>
                <Text style={styles.cartItemText}>
                  {idx + 1}. {item.product.name} ({item.quantity}x) – {renderPrice(item.price * item.quantity)}
                </Text>
                <TouchableOpacity onPress={() => setCart(cart.filter((_, i) => i !== idx))}>
                  <Text style={styles.cartItemRemove}>Remover</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={styles.cartTotalText}>
              Total: {renderPrice(currentTotal)}
            </Text>

            <View style={[styles.row, { marginTop: 16 }]}>
              <Select
                label="Data vencimento"
                placeholder="Data vencimento"
                value={dueDate ? dueDate.toLocaleDateString('pt-BR') : ''}
                onPress={() => setShowDatePicker(true)}
                style={styles.flexItem}
              />
              <View style={{ width: 8 }} />
              <QuantitySelector
                label={paymentMode}
                value={0}
                onChange={switchPaymentMode}
              />
            </View>

            <Input
              placeholder="Observação..."
              value={observation}
              onChangeText={setObservation}
              multiline
              style={{ minHeight: 64, marginTop: 4 }}
            />

            <View style={[styles.row, { marginTop: 8 }]}>
              <Button
                title="Cancelar"
                variant="primary-dark"
                style={styles.flexItem}
                onPress={() => setCart([])}
              />
              <View style={{ width: 8 }} />
              <Button
                title={loading ? "Registrando..." : "Registrar Venda"}
                variant="secondary"
                style={styles.flexItem}
                onPress={handleRegisterSale}
                disabled={loading}
              />
            </View>
          </View>
        )}

      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDueDate(selectedDate);
          }}
        />
      )}

      {/* Basic Modal for Selection */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Selecione o {modalType === 'cliente' ? 'Cliente' : 'Produto'}
            </Text>
            <FlatList
              data={modalType === 'cliente' ? clientsList : productsList as any[]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => selectItem(item)}>
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>Nenhum item encontrado no banco.</Text>}
            />
            <Button title="Fechar" onPress={() => setModalVisible(false)} variant="primary" />
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.main,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100, // space for tab bar
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  flexItem: {
    flex: 1,
  },
  flexItemPrice: {
    flex: 1.2,
  },
  cartContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.light.dark,
    borderRadius: 8,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cartItemText: {
    fontSize: parseInt(typography.sizes.corpo, 10) || 16,
    color: colors.primary.dark,
    fontWeight: 'bold',
  },
  cartItemRemove: {
    fontSize: 12,
    color: colors.primary.main,
    textDecorationLine: 'underline',
  },
  cartTotalText: {
    fontSize: parseInt(typography.sizes.h5, 10) || 18,
    color: colors.primary.dark,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.light.main,
    borderRadius: 8,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: parseInt(typography.sizes.h5, 10) || 20,
    fontWeight: 'bold',
    color: colors.primary.dark,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.dark,
  },
  modalItemText: {
    fontSize: parseInt(typography.sizes.corpo, 10) || 16,
    color: colors.primary.main,
  },
  modalEmpty: {
    textAlign: 'center',
    color: colors.primary.main,
    marginVertical: 16,
  },
});
