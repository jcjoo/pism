import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RecebimentoManual } from './RecebimentoManual';
import { RotaRecebimento } from './RotaRecebimento';
import { colors } from '@/theme/color';

type TabType = 'manual' | 'rota';

export function Recebimentos() {
  const [tab, setTab] = useState<TabType>('manual');

  return (
    <View className="screen">
      <View className="flex-row bg-light-dark border-b border-primary-light/30">
        <TouchableOpacity
          className={`flex-1 flex-row items-center justify-center py-3.5 gap-1.5 border-b-2 ${tab === 'manual' ? 'border-b-primary-dark' : 'border-b-transparent'}`}
          onPress={() => setTab('manual')}
        >
          <Feather name="dollar-sign" size={14} color={tab === 'manual' ? colors.primary.dark : colors.primary.main} />
          <Text className={`text-xs font-semibold ${tab === 'manual' ? 'text-primary-dark font-bold' : 'text-primary'}`}>
            Recebimento Manual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 flex-row items-center justify-center py-3.5 gap-1.5 border-b-2 ${tab === 'rota' ? 'border-b-primary-dark' : 'border-b-transparent'}`}
          onPress={() => setTab('rota')}
        >
          <Feather name="map-pin" size={14} color={tab === 'rota' ? colors.primary.dark : colors.primary.main} />
          <Text className={`text-xs font-semibold ${tab === 'rota' ? 'text-primary-dark font-bold' : 'text-primary'}`}>
            Rota de Recebimento
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'manual' ? <RecebimentoManual /> : <RotaRecebimento />}
    </View>
  );
}
