import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/color';

export interface QuantitySelectorProps {
  value?: number;
  onChange?: (val: number, direction: 'up' | 'down') => void;
  label?: string;
  min?: number;
  displayText?: string;
}

export function QuantitySelector({ value, onChange, label, min = 0, displayText }: QuantitySelectorProps) {
  const [internalQuantity, setInternalQuantity] = useState(min);

  const quantity = value !== undefined ? value : internalQuantity;

  const handleUpdate = (newVal: number) => {
    if (newVal < min) return;
    const direction = newVal > quantity ? 'up' : 'down';
    setInternalQuantity(newVal);
    if (onChange) onChange(newVal, direction);
  };

  return (
    <View className="bg-slate-50 rounded-xl border border-slate-200 my-2">
      {label && (
        <Text className="text-xs font-bold text-primary uppercase tracking-wide px-4 pt-3 mb-1">
          {label}
        </Text>
      )}
      <View className="flex-row items-center justify-between px-2 pb-2.5 pt-1">
        <TouchableOpacity onPress={() => handleUpdate(quantity - 1)} className="p-2">
          <Feather name="minus" size={18} color={colors.primary.main} />
        </TouchableOpacity>
        <Text className="text-base text-primary-dark font-bold">
          {displayText ?? quantity}
        </Text>
        <TouchableOpacity onPress={() => handleUpdate(quantity + 1)} className="p-2">
          <Feather name="plus" size={18} color={colors.primary.main} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
