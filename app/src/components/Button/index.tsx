import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, View } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'primary-dark' | 'primary-light';
  icon?: React.ReactNode;
}

const variantStyles: Record<string, { container: string; text: string }> = {
  primary:       { container: 'bg-primary',       text: 'text-white' },
  'primary-dark': { container: 'bg-primary-dark',  text: 'text-white' },
  'primary-light': { container: 'bg-primary-light', text: 'text-white' },
  secondary:     { container: 'bg-secondary',     text: 'text-dark' },
  danger:        { container: 'bg-danger',        text: 'text-white' },
  ghost:         { container: 'bg-transparent',   text: 'text-primary-dark' },
};

export function Button({ title, variant = 'primary', icon, className, ...rest }: ButtonProps & { className?: string }) {
  const { container, text } = variantStyles[variant] ?? variantStyles.primary;

  return (
    <TouchableOpacity
      className={`py-3 px-6 rounded-lg items-center justify-center min-h-[48px] my-1 ${container} ${icon ? 'flex-row' : ''} ${className ?? ''}`}
      {...rest}
    >
      {icon && <View className="mr-2.5">{icon}</View>}
      <Text className={`text-base font-bold ${text}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
