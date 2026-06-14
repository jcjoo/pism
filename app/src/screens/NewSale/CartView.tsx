import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Input, QuantitySelector, Select } from '@/components';
import { Product } from '@/services/products.service';

interface CartItem { product: Product; quantity: number; price: number; }

interface CartViewProps {
  cart:          CartItem[];
  dueDate:       Date | null;
  paymentMode:   string;
  observation:   string;
  loading:       boolean;
  onRemoveItem:  (idx: number) => void;
  onClear:       () => void;
  onOpenDate:    () => void;
  onSwitchPayment: (value: number, direction: 'up' | 'down') => void;
  onChangeObservation: (s: string) => void;
  onRegister:    () => void;
}

const renderPrice = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export function CartView({
  cart, dueDate, paymentMode, observation, loading,
  onRemoveItem, onClear, onOpenDate, onSwitchPayment,
  onChangeObservation, onRegister,
}: CartViewProps) {
  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <View className="mt-4">
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
              <TouchableOpacity onPress={() => onRemoveItem(idx)}>
                <Text className="text-[11px] text-danger mt-0.5">Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View className="flex-row justify-between items-center mt-3 pt-3" style={{ borderTopWidth: 2, borderTopColor: '#3C096C' }}>
          <Text className="text-base font-bold text-primary-dark">Total</Text>
          <Text className="text-xl font-bold text-primary-dark">{renderPrice(total)}</Text>
        </View>
      </View>

      <View className="flex-row items-center mt-1">
        <Select
          label="Vencimento"
          placeholder="Data vencimento"
          value={dueDate ? dueDate.toLocaleDateString('pt-BR') : ''}
          onPress={onOpenDate}
          className="flex-1"
        />
        <View className="w-2" />
        <QuantitySelector
          label="Pagamento"
          displayText={paymentMode}
          value={1}
          min={0}
          onChange={onSwitchPayment}
        />
      </View>

      <Input
        placeholder="Observação (opcional)..."
        value={observation}
        onChangeText={onChangeObservation}
        multiline
        style={{ minHeight: 64, marginTop: 4 }}
      />

      <View className="flex-row items-center mt-2">
        <Button title="Cancelar" variant="primary-dark" className="flex-1" onPress={onClear} />
        <View className="w-2" />
        <Button
          title={loading ? 'Registrando...' : 'Registrar Venda'}
          variant="secondary"
          className="flex-1"
          onPress={onRegister}
          disabled={loading}
          icon={loading ? undefined : <Feather name="check" size={16} color="#0E0F0C" />}
        />
      </View>
    </View>
  );
}
