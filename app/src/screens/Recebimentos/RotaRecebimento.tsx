import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { Button, useToast } from '@/components';
import { recebimentosService } from '@/services/recebimentos.service';
import { RouteStop } from './types';
import { renderPrice, buildRoute } from './helpers';
import { RouteSwipeView } from './RouteSwipeView';

export function RotaRecebimento() {
  const toast = useToast();
  const [workHours,    setWorkHours]    = useState('8');
  const [avgStop,      setAvgStop]      = useState('15');
  const [targetDate,   setTargetDate]   = useState(new Date());
  const [showPicker,   setShowPicker]   = useState(false);
  const [route,        setRoute]        = useState<RouteStop[]>([]);
  const [excluded,     setExcluded]     = useState<RouteStop[]>([]);
  const [mode,         setMode]         = useState<'config' | 'swipe'>('config');
  const [loading,      setLoading]      = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);

  const generate = async () => {
    const hours = parseFloat(workHours.replace(',', '.'));
    const mins  = parseFloat(avgStop.replace(',', '.'));
    if (isNaN(hours) || hours <= 0 || isNaN(mins) || mins <= 0) {
      toast.show('Preencha horas e tempo por parada.', { type: 'warning' });
      return;
    }
    setLoading(true);
    try {
      let originLat: number | undefined;
      let originLon: number | undefined;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        originLat = pos.coords.latitude;
        originLon = pos.coords.longitude;
      }

      const sales = await recebimentosService.getPending();
      if (sales.length === 0) { toast.show('Não há recebimentos pendentes.', { type: 'info' }); return; }
      const { route: r, excluded: ex } = buildRoute(sales, hours, mins, targetDate, originLat, originLon);
      setRoute(r);
      setExcluded(ex);
      setMode('swipe');
    } catch (e: any) {
      toast.show(e.message, { type: 'error' });
    } finally { setLoading(false); }
  };

  if (mode === 'swipe') {
    return <RouteSwipeView initialRoute={route} onBack={() => setMode('config')} />;
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
      <View className="m-4 bg-white rounded-[14px] p-5 elevation-2">
        <Text className="text-base font-bold text-primary-dark mb-4">Parâmetros da Rota</Text>

        <View className="flex-row mb-3">
          <View className="flex-1 mr-2">
            <Text className="label-upper">Horas disponíveis</Text>
            <TextInput
              className="bg-light rounded-lg p-3 text-[22px] font-bold text-primary-dark text-center"
              value={workHours}
              onChangeText={setWorkHours}
              keyboardType="decimal-pad"
              placeholder="8"
              placeholderTextColor="#8B5A96"
            />
          </View>
          <View className="flex-1">
            <Text className="label-upper">Min. por parada</Text>
            <TextInput
              className="bg-light rounded-lg p-3 text-[22px] font-bold text-primary-dark text-center"
              value={avgStop}
              onChangeText={setAvgStop}
              keyboardType="decimal-pad"
              placeholder="15"
              placeholderTextColor="#8B5A96"
            />
          </View>
        </View>

        <Text className="label-upper">Data da rota</Text>
        <TouchableOpacity
          className="flex-row items-center bg-light rounded-lg p-3 mb-3 gap-2"
          onPress={() => setShowPicker(true)}
        >
          <Feather name="calendar" size={16} color="#3C096C" />
          <Text className="text-sm text-primary-dark font-semibold capitalize">
            {targetDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={targetDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => { setShowPicker(false); if (date) setTargetDate(date); }}
          />
        )}

        <Button
          title={loading ? 'Gerando rota...' : 'Gerar Rota'}
          variant="secondary"
          disabled={loading}
          onPress={generate}
          icon={<Feather name="map-pin" size={16} color="#0E0F0C" />}
        />
      </View>

      <View className="flex-row items-start gap-2 bg-primary/15 mx-4 rounded-[10px] p-3.5 mb-2">
        <Feather name="info" size={16} color="#5A189A" />
        <Text className="flex-1 text-xs text-primary leading-[18px]">
          A rota agrupa paradas por cidade, prioriza atrasados e respeita seu tempo disponível.
          Vendas parceladas reaparecem a cada mês enquanto houver parcelas pendentes.
        </Text>
      </View>

      {excluded.length > 0 && (
        <View className="px-4">
          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 bg-light-dark rounded-lg p-3 mb-3"
            onPress={() => setShowExcluded(v => !v)}
          >
            <Feather name={showExcluded ? 'chevron-up' : 'chevron-down'} size={16} color="#5A189A" />
            <Text className="text-xs text-primary font-semibold">
              {excluded.length} paradas não incluídas na última rota
            </Text>
          </TouchableOpacity>
          {showExcluded && excluded.map((stop, i) => (
            <View key={i} className="bg-white rounded-lg p-3 mb-2 opacity-60 border-l-[3px] border-l-primary-light">
              <Text className="text-[13px] font-bold text-primary-dark">{stop.sale.clients?.name}</Text>
              <Text className="text-[11px] text-primary mt-0.5">{stop.city} · {renderPrice(stop.total)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
