import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components';
import { STATUS_CONFIG } from './types';
import { renderPrice, formatDate, calcTotal, getDaysUntilDue, getDueStatus } from './helpers';
import { colors } from '@/theme/color';

interface SaleListStepProps {
  salesData:      any[];
  totalAll:       number;
  totalReceived:  number;
  totalPending:   number;
  onSelectSale:   (sale: any) => void;
  onBack:         () => void;
  onNewSearch:    () => void;
}

export function SaleListStep({
  salesData, totalAll, totalReceived, totalPending,
  onSelectSale, onBack, onNewSearch,
}: SaleListStepProps) {
  return (
    <View>
      <View className="flex-row gap-2 mt-4 mb-3">
        <View className="flex-1 bg-white rounded-xl p-3 border-l-[3px] border-l-primary" style={{ elevation: 2, shadowColor: colors.primary.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 }}>
          <Feather name="dollar-sign" size={12} color={colors.primary.main} />
          <Text className="text-[10px] text-primary font-semibold mt-1">Total</Text>
          <Text className="text-[13px] font-bold text-primary-dark mt-0.5">{renderPrice(totalAll)}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border-l-[3px] border-l-success" style={{ elevation: 2, shadowColor: colors.success.main, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 }}>
          <Feather name="check-circle" size={12} color={colors.success.main} />
          <Text className="text-[10px] text-primary font-semibold mt-1">Recebido</Text>
          <Text className="text-[13px] font-bold text-success mt-0.5">{renderPrice(totalReceived)}</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl p-3 border-l-[3px] border-l-danger" style={{ elevation: 2, shadowColor: colors.danger.main, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 }}>
          <Feather name="clock" size={12} color={colors.danger.main} />
          <Text className="text-[10px] text-primary font-semibold mt-1">A receber</Text>
          <Text className="text-[13px] font-bold text-danger mt-0.5">{renderPrice(totalPending)}</Text>
        </View>
      </View>

      <View className="bg-light-dark rounded-xl p-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-primary-dark font-bold text-base">
            {salesData.length} venda{salesData.length !== 1 ? 's' : ''}
          </Text>
          <Feather name="list" size={18} color={colors.primary.dark} />
        </View>

        {salesData.length === 0 ? (
          <Text className="text-center text-primary my-6">Nenhuma venda encontrada.</Text>
        ) : (
          salesData.map((sale, idx) => {
            const st   = getDueStatus(sale);
            const cfg  = STATUS_CONFIG[st];
            const days = sale.received_at ? null : getDaysUntilDue(sale.dueDate);
            return (
              <TouchableOpacity
                key={sale.id}
                className="flex-row items-center py-3 px-2.5 rounded-xl mb-2 bg-light"
                style={{ elevation: 1, shadowColor: colors.primary.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 }}
                onPress={() => onSelectSale(sale)}
              >
                <View
                  className="w-1 self-stretch rounded-full mr-2.5"
                  style={{ backgroundColor: cfg.color, minHeight: 36 }}
                />
                <View className="flex-1 mr-2">
                  <Text className="text-primary-dark font-bold text-sm" numberOfLines={1}>
                    {sale.clients?.name || 'Cliente deletado'}
                  </Text>
                  <Text className="text-primary text-[11px] mt-0.5" numberOfLines={1}>
                    {formatDate(sale.created_at)}
                    {days !== null && days < 0 && ` · ${Math.abs(days)}d atraso`}
                    {days === 0 && ' · Vence hoje'}
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Text className="text-[13px] font-bold text-primary-dark">
                    {renderPrice(calcTotal(sale.sale_items))}
                  </Text>
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg }}>
                    <Text className="text-[9px] font-bold" style={{ color: cfg.color }}>{cfg.label}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <View className="flex-row items-center my-1 mt-4">
        <Button title="Voltar" variant="primary-dark" className="flex-1" onPress={onBack} />
        <View className="w-2" />
        <Button title="Nova Busca" variant="secondary" className="flex-1" onPress={onNewSearch} />
      </View>
    </View>
  );
}
