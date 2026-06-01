import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
}

export function Input({ label, className, ...rest }: InputProps & { className?: string }) {
  return (
    <View className={`bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 my-2 w-full ${className ?? ''}`}>
      {label && (
        <Text className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
          {label}
        </Text>
      )}
      <TextInput
        className="text-base text-primary-dark font-semibold p-0"
        placeholderTextColor="#8B5A96"
        {...rest}
      />
    </View>
  );
}
