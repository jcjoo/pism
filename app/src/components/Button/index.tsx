import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps } from 'react-native';
import { colors, typography } from '../../theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'primary-dark' | 'primary-light';
}

export function Button({ title, variant = 'primary', style, ...rest }: ButtonProps) {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary': return colors.primary.main;
      case 'primary-dark': return colors.primary.dark;
      case 'primary-light': return colors.primary.light;
      case 'secondary': return colors.secondary.main;
      case 'danger': return colors.danger.main;
      case 'ghost': return 'transparent';
      default: return colors.primary.main;
    }
  };

  const getTextColor = () => {
    if (variant === 'ghost') return colors.primary.dark;
    if (variant === 'secondary') return colors.dark.main;
    return '#FFFFFF';
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: getBackgroundColor() }, style]}
      {...rest}
    >
      <Text style={[styles.title, { color: getTextColor() }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginVertical: 4,
  },
  title: {
    fontSize: parseInt(typography.sizes.corpo, 10) || 16,
    fontWeight: 'bold',
  },
});
