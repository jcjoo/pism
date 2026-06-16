import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components';
import { RouteStop } from './types';
import { renderPrice } from './helpers';
import { colors } from '@/theme/color';

interface CompletionViewProps {
  received:       number;
  totalCollected: number;
  skipped:        RouteStop[];
  onBack:         () => void;
}

export function CompletionView({ received, totalCollected, skipped, onBack }: CompletionViewProps) {
  return (
    <View className="flex-1 p-6 justify-center pb-[120px]">
      <View className="bg-white rounded-[20px] p-8 items-center mb-4 elevation-2">
        <Feather name="check-circle" size={64} color={colors.secondary.dark} />
        <Text className="text-2xl font-bold text-primary-dark mt-4 mb-6">Rota concluída!</Text>

        <View className="flex-row w-full mb-5">
          <View className="flex-1 items-center gap-1">
            <Text className="text-lg font-bold text-primary-dark text-center">{received}</Text>
            <Text className="text-[11px] text-primary">recebimentos</Text>
          </View>
          <View className="w-px bg-light-dark my-1" />
          <View className="flex-1 items-center gap-1">
            <Text className="text-lg font-bold text-primary-dark text-center">{renderPrice(totalCollected)}</Text>
            <Text className="text-[11px] text-primary">total recebido</Text>
          </View>
        </View>

        {skipped.length > 0 && (
          <View className="w-full bg-light rounded-[10px] p-4">
            <Text className="text-[13px] font-bold text-primary-dark mb-2">
              {skipped.length} parada{skipped.length > 1 ? 's' : ''} não visitada{skipped.length > 1 ? 's' : ''}
            </Text>
            {skipped.map((stop, i) => (
              <Text key={i} className="text-xs text-primary mb-1">
                · {stop.sale.clients?.name} ({renderPrice(stop.total)})
              </Text>
            ))}
            <Text className="text-[11px] text-primary-light mt-2 italic">
              Inclua no próximo dia ou use Recebimento Manual.
            </Text>
          </View>
        )}
      </View>

      <Button title="Voltar à configuração" variant="primary-dark" onPress={onBack} />
    </View>
  );
}
