import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography } from '../../theme';

export interface QuantitySelectorProps {
  value?: number;
  onChange?: (val: number) => void;
  label?: string;
  min?: number;
}

export function QuantitySelector({ value, onChange, label = 'Quantidade', min = 1 }: QuantitySelectorProps) {
  const [internalQuantity, setInternalQuantity] = useState(min);

  const quantity = value !== undefined ? value : internalQuantity;

  const handleUpdate = (newVal: number) => {
    if (newVal < min) return;
    setInternalQuantity(newVal);
    if (onChange) onChange(newVal);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => handleUpdate(quantity - 1)} style={styles.button}>
        <Text style={styles.buttonText}>-</Text>
      </TouchableOpacity>
      <Text style={styles.text}>{label} {quantity > 0 ? `(${quantity})` : ''}</Text>
      <TouchableOpacity onPress={() => handleUpdate(quantity + 1)} style={styles.button}>
        <Text style={styles.buttonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.dark,
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  button: {
    padding: 8,
  },
  buttonText: {
    fontSize: parseInt(typography.sizes.h5, 10) || 20,
    color: colors.primary.main,
    fontWeight: 'bold',
  },
  text: {
    fontSize: parseInt(typography.sizes.corpo, 10) || 16,
    color: colors.primary.dark,
    fontWeight: 'bold',
  },
});
