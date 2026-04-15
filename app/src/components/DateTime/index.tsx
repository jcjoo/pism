import React, { useState } from 'react';
import { View, Button, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Select } from '../Select';

interface DateTimeProps {
  value: Date;
  mode: 'date' | 'time'; // Restrito para aceitar apenas dia ou hora
  onDateChange: (date: Date) => void;
}

 export function DateTime({value, mode, onDateChange, ...Rest}: DateTimeProps) {
  const [show, setShow] = useState(false);
  const [dateTimeValue, setDateTimeValue] = useState(new Date())

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // No Android, o calendário precisa ser fechado manualmente após a seleção
    if (Platform.OS === 'android') {
      setShow(false);
    }

    // Só atualiza o estado se o usuário confirmou (não clicou em "cancelar")
    if (event.type === 'set' && selectedDate) {
      onDateChange(selectedDate);
      setDateTimeValue(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      {/* O botão só aparece no Android, pois no iOS o picker fica direto na tela */}
      {!show && (
        mode === 'date' ? (
          <Select
            label="Data"
            value={dateTimeValue.toLocaleDateString('pt-BR')}
            onPress={() => { if(Platform.OS !== 'web'){setShow(true)} }}
          />
        ) : (
          <Select
            label="Hora"
            value={dateTimeValue.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
            onPress={() => { if(Platform.OS !== 'web'){setShow(true)} }}
          />
        ))}
      {(show) && (
        <DateTimePicker
          value={value}
          mode={mode} // Aqui ele recebe 'date' ou 'time'
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  flexItem: { flex: 1 },
});