import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, Text, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography } from '../../theme';

interface SelectProps extends TouchableOpacityProps {
  label: string;
  value?: string;
  placeholder?: string;
}

export function Select({ label, value, placeholder, style, ...rest }: SelectProps) {
  return (
    <TouchableOpacity style={[styles.container, style]} activeOpacity={0.8} {...rest}>
      <Text style={value ? styles.value : styles.placeholder}>
        {value || placeholder || label}
      </Text>
      <Feather name="chevron-down" size={20} color={colors.primary.main} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.light.dark,
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  value: {
    fontSize: parseInt(typography.sizes.corpo, 10) || 16,
    color: colors.primary.dark,
    fontWeight: 'bold',
  },
  placeholder: {
    fontSize: parseInt(typography.sizes.corpo, 10) || 16,
    color: colors.primary.main,
    fontWeight: 'bold',
  },
});
