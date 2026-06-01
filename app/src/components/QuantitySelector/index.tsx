import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface QuantitySelectorProps {
  value?: number;
  onChange?: (val: number, direction: 'up' | 'down') => void;
  label?: string;
  min?: number;
}

export function QuantitySelector({ value, onChange, label = 'Quantidade', min = 0 }: QuantitySelectorProps) {
  const [internalQuantity, setInternalQuantity] = useState(min);

  const quantity = value !== undefined ? value : internalQuantity;

  const handleUpdate = (newVal: number) => {
    if (newVal < min) return;
    const direction = newVal > quantity ? 'up' : 'down';
    setInternalQuantity(newVal);
    if (onChange) onChange(newVal, direction);
  };

  return (
    <View className="flex-row items-center bg-light-dark rounded-lg min-h-[48px] px-3 justify-between my-1">
      <TouchableOpacity onPress={() => handleUpdate(quantity - 1)} className="p-2">
        <Feather name="minus" size={20} color="#5A189A" />
      </TouchableOpacity>
      <Text className="text-base text-primary-dark font-bold">{label}</Text>
      <TouchableOpacity onPress={() => handleUpdate(quantity + 1)} className="p-2">
        <Feather name="plus" size={20} color="#5A189A" />
      </TouchableOpacity>
    </View>
  );
}
