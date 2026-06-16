import React from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components';
import { formatDate } from './helpers';
import { colors } from '@/theme/color';

interface ReceiptModalProps {
  visible:       boolean;
  clientName:    string | undefined;
  isEdit:        boolean;
  date:          Date;
  amount:        string;
  saving:        boolean;
  onChangeAmount: (v: string) => void;
  onOpenDatePicker: () => void;
  onConfirm:     () => void;
  onCancel:      () => void;
}

export function ReceiptModal({
  visible, clientName, isEdit, date, amount, saving,
  onChangeAmount, onOpenDatePicker, onConfirm, onCancel,
}: ReceiptModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
          activeOpacity={1}
          onPress={() => !saving && onCancel()}
        />
        <TouchableOpacity activeOpacity={1} className="modal-sheet-bottom">
          <Text className="text-lg font-bold text-primary-dark text-center mb-0.5">
            {isEdit ? 'Editar Recebimento' : 'Marcar como Recebido'}
          </Text>
          {clientName && (
            <Text className="text-[13px] text-primary text-center mb-4">{clientName}</Text>
          )}

          <Text className="label-upper mt-3">Data do recebimento</Text>
          <TouchableOpacity
            className="flex-row items-center gap-2 bg-light rounded-[10px] p-3.5 mb-1"
            onPress={onOpenDatePicker}
          >
            <Feather name="calendar" size={16} color={colors.primary.dark} />
            <Text className="text-base font-semibold text-primary-dark">{formatDate(date)}</Text>
          </TouchableOpacity>

          <Text className="label-upper mt-3">Valor recebido (R$)</Text>
          <TextInput
            className="amount-input text-[26px]"
            value={amount}
            onChangeText={onChangeAmount}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />

          <View className="flex-row items-center">
            <Button
              title="Cancelar"
              variant="primary-dark"
              className="flex-1"
              onPress={onCancel}
              disabled={saving}
            />
            <View className="w-2" />
            <Button
              title={saving ? 'Salvando...' : 'Confirmar'}
              variant="secondary"
              className="flex-[1.5]"
              onPress={onConfirm}
              disabled={saving}
            />
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
