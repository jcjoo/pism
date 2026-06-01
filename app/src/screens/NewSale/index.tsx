import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Input, Button, QuantitySelector, Select } from '@/components';
import { useAuth } from '@/hooks/useAuth';

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
    if (!client) { alert('Por favor, selecione um Cliente primeiro!'); return; }
    if (cart.length === 0) { alert('O carrinho está vazio!'); return; }
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

      alert('Venda registrada com sucesso! ✅');
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
      className="screen"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}>

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
                placeholder="Valor (R$)"
                value={price}
                onChangeText={setPrice}
                className="flex-[1.2]"
                keyboardType="decimal-pad"
              />
              <View className="w-2" />
              <QuantitySelector label="Quantidade" value={quantity} onChange={setQuantity} />
            </View>

            <View className="flex-row items-center my-1">
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
              />
            </View>
          </>
        )}

        {cart.length > 0 && (
          <View className="mt-6 p-4 bg-light-dark rounded-lg">
            {cart.map((item, idx) => (
              <View key={idx} className="flex-row justify-between items-center mb-3">
                <Text className="text-base text-primary-dark font-bold">
                  {idx + 1}. {item.product.name} ({item.quantity}x) – {renderPrice(item.price * item.quantity)}
                </Text>
                <TouchableOpacity onPress={() => setCart(cart.filter((_, i) => i !== idx))}>
                  <Text className="text-xs text-primary underline">Remover</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text className="text-lg text-primary-dark font-bold mt-3 mb-2">
              Total: {renderPrice(currentTotal)}
            </Text>

            <View className="flex-row items-center mt-4">
              <Select
                label="Data vencimento"
                placeholder="Data vencimento"
                value={dueDate ? dueDate.toLocaleDateString('pt-BR') : ''}
                onPress={() => setShowDatePicker(true)}
                className="flex-1"
              />
              <View className="w-2" />
              <QuantitySelector label={paymentMode} value={1} min={0} onChange={switchPaymentMode} />
            </View>

            <Input
              placeholder="Observação..."
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
                title={loading ? 'Registrando...' : 'Registrar Venda'}
                variant="secondary"
                className="flex-1"
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
