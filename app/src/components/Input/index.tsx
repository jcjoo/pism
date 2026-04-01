import React from 'react';
import { TextInput, TextInputProps, StyleSheet, View } from 'react-native';
import { colors, typography } from '../../theme';

interface InputProps extends TextInputProps {}

export function Input({ style, ...rest }: InputProps) {
  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.primary.main}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.light.main,
    borderRadius: 8,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
    marginVertical: 4,
  },
  input: {
    fontSize: parseInt(typography.sizes.corpo, 10) || 16,
    color: colors.primary.dark,
    fontWeight: 'bold',
  },
});
