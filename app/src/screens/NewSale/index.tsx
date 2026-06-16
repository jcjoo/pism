import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Input, Button, QuantitySelector, Select, FormScrollView, useToast } from '@/components';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';

import { clientsService, Client } from '@/services/clients.service';
import { productsService, Product } from '@/services/products.service';
import { salesService } from '@/services/sales.service';

import { SelectorModal } from './SelectorModal';
import { CartView } from './CartView';

export function NewSale() {
  const { userId } = useAuth();
  const toast = useToast();
  const [client, setClient]   = useState<Client | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [price, setPrice]     = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart]       = useState<{ product: Product; quantity: number; price: number }[]>([]);

  const [clientsList,  setClientsList]  = useState<Client[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType,    setModalType]    = useState<'cliente' | 'product'>('cliente');

  const [dueDate,        setDueDate]        = useState<Date | null>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentMode,    setPaymentMode]    = useState('À vista');
  const paymentOptions = ['À vista', '2x', '3x', '4x', '5x', '6x'];
  const [observation, setObservation] = useState('');
  const [loading, setLoading]         = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          setClientsList(await clientsService.getAll());
          setProductsList(await productsService.getAll());
        } catch (error) { console.error('Error loading data:', error); }
      };
      loadData();
    }, [])
  );

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
    setCart(prevCart => {
      const idx = prevCart.findIndex(item => item.product.id === product.id);
      if (idx >= 0) {
        const next = [...prevCart];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
        return next;
      }
      return [...prevCart, { product, quantity, price: itemPrice }];
    });
    setProduct(null); setPrice(''); setQuantity(1);
  };

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
    if (!client)         { toast.show('Por favor, selecione um Cliente primeiro!', { type: 'warning' }); return; }
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
          observation: observation.trim() || null,
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
      setClient(null); setCart([]); setPaymentMode('À vista');
      setObservation(''); setDueDate(new Date());
    } catch (error: any) { toast.show(error.message, { type: 'error' }); }
    finally { setLoading(false); }
  };

  return (
    <View className="screen">
      <FormScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}>
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
              <Button title="Remover" variant="primary" className="flex-1" onPress={() => { setProduct(null); setPrice(''); }} />
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
          <CartView
            cart={cart}
            dueDate={dueDate}
            paymentMode={paymentMode}
            observation={observation}
            loading={loading}
            onRemoveItem={(idx) => setCart(cart.filter((_, i) => i !== idx))}
            onClear={() => setCart([])}
            onOpenDate={() => setShowDatePicker(true)}
            onSwitchPayment={switchPaymentMode}
            onChangeObservation={setObservation}
            onRegister={handleRegisterSale}
          />
        )}
      </FormScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDueDate(selectedDate);
          }}
        />
      )}

      <SelectorModal
        visible={modalVisible}
        type={modalType}
        clients={clientsList}
        products={productsList}
        onSelect={selectItem}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}
