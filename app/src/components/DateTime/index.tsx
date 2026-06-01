import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Select } from '../Select';

interface DateTimeProps {
  value: Date;
  mode: 'date' | 'time';
  onDateChange: (date: Date) => void;
}

export function DateTime({ value, mode, onDateChange }: DateTimeProps) {
  const [show, setShow] = useState(false);
  const [dateTimeValue, setDateTimeValue] = useState(new Date());

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (event.type === 'set' && selectedDate) {
      onDateChange(selectedDate);
      setDateTimeValue(selectedDate);
    }
  };

  return (
    <View className="my-2.5">
      {!show && (
        mode === 'date' ? (
          <Select
            label="Data"
            value={dateTimeValue.toLocaleDateString('pt-BR')}
            onPress={() => { if (Platform.OS !== 'web') setShow(true); }}
          />
        ) : (
          <Select
            label="Hora"
            value={dateTimeValue.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            onPress={() => { if (Platform.OS !== 'web') setShow(true); }}
          />
        )
      )}
      {show && (
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
}
