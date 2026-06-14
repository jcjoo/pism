import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Button, Input, QuantitySelector, Select } from '@/components';
import { renderPrice, formatDate, calcTotal } from './helpers';

interface SaleEditStepProps {
  sale:             any;
  editCart:         any[];
  setEditCart:      (c: any[]) => void;
  editDueDate:      Date | null;
  editPaymentMode:  string;
  editObservation:  string;
  setEditObservation: (s: string) => void;
  loading:          boolean;
  onSave:           () => void;
  onCancel:         () => void;
  onDelete:         () => void;
  switchPayment:    () => void;
  onOpenDatePicker: (target: string) => void;
}

export function SaleEditStep({
  sale, editCart, setEditCart, editDueDate, editPaymentMode,
  editObservation, setEditObservation,
  loading, onSave, onCancel, onDelete, switchPayment, onOpenDatePicker,
}: SaleEditStepProps) {
  return (
    <View>
      <Select label="Cliente" value={sale.clients?.name} disabled />

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
          onPress={() => onOpenDatePicker('editDueDate')}
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
        <Button title="Cancelar" variant="primary-dark" className="flex-1" onPress={onCancel} />
        <View className="w-2" />
        <Button title="Salvar" variant="secondary" className="flex-1" onPress={onSave} />
      </View>

      <Button
        title={loading ? 'Apagando...' : 'Apagar Venda'}
        variant="danger"
        onPress={onDelete}
        disabled={loading}
        className="mt-2"
      />
    </View>
  );
}
