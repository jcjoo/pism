import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Input, Button, QuantitySelector, Select, useToast } from '@/components';
import { useAuth } from '@/hooks/useAuth';

import { clientsService, Client } from '@/services/clients.service';
import { productsService, Product } from '@/services/products.service';
import { salesService } from '@/services/sales.service';

export function NewSale() {
  const { userId } = useAuth();
  const toast = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<{ product: Product; quantity: number; price: number }[]>([]);

  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'cliente' | 'product'>('cliente');

  const [dueDate, setDueDate] = useState<Date | null>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentMode, setPaymentMode] = useState('À vista');
  const paymentOptions = ['À vista', '2x', '3x', '4x', '5x', '6x'];
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setClientsList(await clientsService.getAll());
        setProductsList(await productsService.getAll());
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

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
          quantity: newCart[existingItemIndex].quantity + quantity,
        };
        return newCart;
      }
      return [...prevCart, { product, quantity, price: itemPrice }];
    });

    setProduct(null);
    setPrice('');
    setQuantity(1);
  };

  const currentTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const renderPrice = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  const switchPaymentMode = (_: number, direction: 'up' | 'down') => {
    setPaymentMode(prev => {
      const index = paymentOptions.indexOf(prev);
      const nextIndex = direction === 'up'
        ? (index + 1) % paymentOptions.length
        : (index - 1 + paymentOptions.length) % paymentOptions.length;
      return paymentOptions[nextIndex];
    });
  };

  const handleRegisterSale = async () => {
    if (!client) { toast.show('Por favor, selecione um Cliente primeiro!', { type: 'warning' }); return; }
    if (cart.length === 0) { toast.show('O carrinho está vazio!', { type: 'warning' }); return; }
    if (!dueDate) return;

    setLoading(true);
    try {
      if (!userId) throw new Error('Usuário não autenticado');

      const isCash = paymentMode === 'À vista';
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

      toast.show('Venda registrada com sucesso!', { type: 'success' });
      setClient(null);
      setCart([]);
      setPaymentMode('À vista');
      setObservation('');
      setDueDate(new Date());
    } catch (error: any) {
      toast.show(error.message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="screen"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}>

        {/* Cliente e Produto */}
        <Select
          label="Cliente"
          value={client?.name || ''}
          placeholder="Selecione um Cliente"
          onPress={() => { setModalType('cliente'); setModalVisible(true); }}
        />

        <Select
          label="Mercadoria"
          placeholder={product ? product.name : 'Selecione uma Mercadoria'}
          value={product?.name || ''}
          onPress={() => { setModalType('product'); setModalVisible(true); }}
        />

        {product && (
          <>
            <View className="flex-row items-center my-1">
              <Input
                label="Valor (R$)"
                placeholder="0,00"
                value={price}
                onChangeText={setPrice}
                className="flex-[1.2]"
                keyboardType="decimal-pad"
              />
              <View className="w-2" />
              <QuantitySelector label="Qtd." value={quantity} onChange={setQuantity} min={1} />
            </View>

            <View className="flex-row items-center mb-1">
              <Button
                title="Remover"
                variant="primary"
                className="flex-1"
                onPress={() => { setProduct(null); setPrice(''); }}
              />
              <View className="w-2" />
              <Button
                title="Adicionar"
                variant="primary-dark"
                className="flex-1"
                onPress={handleAddToCart}
                icon={<Feather name="plus" size={16} color="#fff" />}
              />
            </View>
          </>
        )}

        {cart.length > 0 && (
          <View className="mt-4">
            {/* Header do carrinho */}
            <View className="flex-row items-center justify-between mb-2 px-1">
              <Text className="text-base font-bold text-primary-dark">Carrinho</Text>
              <View className="flex-row items-center gap-1">
                <Feather name="shopping-bag" size={13} color="#5A189A" />
                <Text className="text-xs font-semibold text-primary">
                  {cart.length} item{cart.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            <View className="p-4 bg-light-dark rounded-xl">
              {cart.map((item, idx) => (
                <View
                  key={idx}
                  className="flex-row items-center justify-between py-2.5"
                  style={{ borderBottomWidth: idx < cart.length - 1 ? 1 : 0, borderBottomColor: '#E1DAE8' }}
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-sm font-bold text-primary-dark" numberOfLines={1}>
                      {item.product.name}
                    </Text>
                    <Text className="text-xs text-primary mt-0.5">
                      {item.quantity}x · {renderPrice(item.price)}/un
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-bold text-primary-dark">
                      {renderPrice(item.price * item.quantity)}
                    </Text>
                    <TouchableOpacity onPress={() => setCart(cart.filter((_, i) => i !== idx))}>
                      <Text className="text-[11px] text-danger mt-0.5">Remover</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Total */}
              <View className="flex-row justify-between items-center mt-3 pt-3" style={{ borderTopWidth: 2, borderTopColor: '#3C096C' }}>
                <Text className="text-base font-bold text-primary-dark">Total</Text>
                <Text className="text-xl font-bold text-primary-dark">{renderPrice(currentTotal)}</Text>
              </View>
            </View>

            {/* Vencimento e Pagamento */}
            <View className="flex-row items-center mt-1">
              <Select
                label="Vencimento"
                placeholder="Data vencimento"
                value={dueDate ? dueDate.toLocaleDateString('pt-BR') : ''}
                onPress={() => setShowDatePicker(true)}
                className="flex-1"
              />
              <View className="w-2" />
              <QuantitySelector
                label="Pagamento"
                displayText={paymentMode}
                value={1}
                min={0}
                onChange={switchPaymentMode}
              />
            </View>

            <Input
              placeholder="Observação (opcional)..."
              value={observation}
              onChangeText={setObservation}
              multiline
              style={{ minHeight: 64, marginTop: 4 }}
            />

            <View className="flex-row items-center mt-2">
              <Button
                title="Cancelar"
                variant="primary-dark"
                className="flex-1"
                onPress={() => setCart([])}
              />
              <View className="w-2" />
              <Button
                title={loading ? 'Registrando...' : '+Venda'}
                variant="secondary"
                className="flex-1"
                onPress={handleRegisterSale}
                disabled={loading}
                icon={loading ? undefined : <Feather name="check" size={16} color="#0E0F0C" />}
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

      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="modal-overlay-center">
          <View className="modal-panel-center">
            <Text className="modal-title">
              Selecione o {modalType === 'cliente' ? 'Cliente' : 'Produto'}
            </Text>
            <FlatList
              data={(modalType === 'cliente' ? clientsList : productsList) as any[]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="modal-item"
                  onPress={() => selectItem(item)}
                >
                  <Text className="text-base text-primary">{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text className="empty-text">Nenhum item encontrado no banco.</Text>
              }
            />
            <Button title="Fechar" onPress={() => setModalVisible(false)} variant="primary" />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
