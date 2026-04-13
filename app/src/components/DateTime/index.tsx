import React, { useState } from 'react';
import { View, Button, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface DateTimeProps {
  value: Date;
  mode: 'date' | 'time'; // Restrito para aceitar apenas dia ou hora
  onDateChange: (date: Date) => void;
  buttonTitle?: string;
}

export function DateTime({
  value,
  mode,
  onDateChange,
  buttonTitle = "Selecionar"
}: DateTimeProps) {

  const [show, setShow] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // No Android, o calendário precisa ser fechado manualmente após a seleção
    if (Platform.OS === 'android') {
      setShow(false);
    }

    // Só atualiza o estado se o usuário confirmou (não clicou em "cancelar")
    if (event.type === 'set' && selectedDate) {
      onDateChange(selectedDate);
    }
  };

  return (
    <View style={{ marginVertical: 10, backgroundColor: 'red', padding: 20 }}>
      <View style={styles.container}>
        {/* O botão só aparece no Android, pois no iOS o picker fica direto na tela */}
        {Platform.OS === 'android' && (
          <Button title={buttonTitle} onPress={() => setShow(true)} />
        )}

        {(show || Platform.OS === 'ios') && (
          <DateTimePicker
            value={value}
            mode={mode} // Aqui ele recebe 'date' ou 'time'
            display="default"
            onChange={handleChange}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
});