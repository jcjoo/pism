import React, { useState } from 'react';
import { TextInput, TextInputProps, View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/color';

interface InputProps extends TextInputProps {
  label?: string;
}

export function Input({ label, className, secureTextEntry, ...rest }: InputProps & { className?: string }) {
  const [hidden, setHidden] = useState(true);

  return (
    <View className={`bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 my-2 w-full ${className ?? ''}`}>
      {label && (
        <Text className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
          {label}
        </Text>
      )}
      <View className="flex-row items-center">
        <TextInput
          className="flex-1 text-base text-primary-dark font-semibold p-0"
          placeholderTextColor={colors.primary.light}
          secureTextEntry={secureTextEntry ? hidden : false}
          {...rest}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setHidden(h => !h)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={colors.primary.light} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
