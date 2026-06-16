import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/color';

interface SelectProps extends TouchableOpacityProps {
  label: string;
  value?: string;
  placeholder?: string;
  className?: string;
}

export function Select({ label, value, placeholder, className, ...rest }: SelectProps) {
  return (
    <TouchableOpacity
      className={`bg-light-dark rounded-lg min-h-[48px] px-4 flex-row items-center justify-between my-1 ${className ?? ''}`}
      activeOpacity={0.8}
      {...rest}
    >
      <Text className={`text-base font-bold ${value ? 'text-primary-dark' : 'text-primary'}`}>
        {value || placeholder || label}
      </Text>
      <Feather name="chevron-down" size={20} color={colors.primary.main} />
    </TouchableOpacity>
  );
}
