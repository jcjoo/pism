import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components';
import { STATUS_CONFIG } from './types';
import { renderPrice, formatDate, calcTotal, getDaysUntilDue, getDueStatus } from './helpers';

interface SaleDetailsStepProps {
  sale:             any;
  savingReceipt:    boolean;
  onBack:           () => void;
  onEdit:           () => void;
  onMarkReceived:   () => void;
  onEditReceipt:    () => void;
  onRemoveReceipt:  () => void;
}

export function SaleDetailsStep({
  sale, savingReceipt,
  onBack, onEdit, onMarkReceived, onEditReceipt, onRemoveReceipt,
}: SaleDetailsStepProps) {
  const st    = getDueStatus(sale);
  const cfg   = STATUS_CONFIG[st];
  const days  = sale.received_at ? null : getDaysUntilDue(sale.dueDate);
  const total = calcTotal(sale.sale_items);

  return (
    <View>
      <View
        className="bg-light-dark rounded-[10px] p-6 items-center mt-4"
        style={{ borderTopWidth: 4, borderTopColor: cfg.color }}
      >
        <Text className="text-xl font-bold text-primary-dark text-center">
          {sale.clients?.name}
        </Text>
        <Text className="text-xs text-primary text-center mb-5">
          {sale.clients?.address}
        </Text>

        <Text className="text-[28px] font-bold text-primary-dark mb-4">
          {renderPrice(total)}
        </Text>

        {sale.sale_items.map((item: any) => (
          <Text key={item.id} className="text-primary text-sm mb-1">
            ({item.quantity}x) {item.products?.name} — {renderPrice(item.price)}
          </Text>
        ))}

        <Text className="text-primary text-xs mt-4">Data compra: {formatDate(sale.created_at)}</Text>
        <Text className="text-primary text-xs mt-1">Vencimento: {formatDate(sale.dueDate)}</Text>

        {sale.observation ? (
          <View className="w-full mt-4 p-3 rounded-[10px] bg-white border border-light-dark">
            <Text className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1">Observação</Text>
            <Text className="text-sm text-primary-dark">{sale.observation}</Text>
          </View>
        ) : null}

        <View
          className="w-full mt-5 p-3.5 rounded-[10px] border"
          style={{ backgroundColor: cfg.bg, borderColor: cfg.color }}
        >
          {sale.received_at ? (
            <>
              <View className="flex-row items-center gap-2 mb-1.5">
                <Feather name="check-circle" size={16} color={cfg.color} />
                <Text className="text-sm font-bold" style={{ color: cfg.color }}>Recebido</Text>
              </View>
              <Text className="text-[13px] text-primary-dark mb-0.5">
                Em: {formatDate(sale.received_at)}
              </Text>
              <Text className="text-[13px] text-primary-dark mb-0.5">
                Valor: {renderPrice(sale.received_amount ?? total)}
              </Text>
              {sale.received_amount != null &&
                Math.abs(sale.received_amount - total) > 0.01 && (
                  <Text className="text-[13px] text-danger mb-0.5">
                    Diferença: {renderPrice(sale.received_amount - total)}
                  </Text>
                )}
              <View className="flex-row items-center mt-2.5">
                <Button
                  title="Editar recebimento"
                  variant="primary-light"
                  className="flex-1"
                  onPress={onEditReceipt}
                  icon={<Feather name="edit-2" size={14} color="#fff" />}
                />
                <View className="w-2" />
                <Button
                  title="Remover"
                  variant="danger"
                  onPress={onRemoveReceipt}
                  disabled={savingReceipt}
                />
              </View>
            </>
          ) : (
            <>
              <View className="flex-row items-center gap-2 mb-1.5">
                <Feather name="clock" size={16} color={cfg.color} />
                <Text className="text-sm font-bold" style={{ color: cfg.color }}>
                  {st === 'overdue'
                    ? `Atrasado ${Math.abs(days!)} dia${Math.abs(days!) > 1 ? 's' : ''}`
                    : st === 'today'
                    ? 'Vence hoje'
                    : `Vence em ${days} dia${days! > 1 ? 's' : ''}`}
                </Text>
              </View>
              <Text className="text-[13px] text-primary-dark">Aguardando recebimento</Text>
              <Button
                title="Marcar como recebido"
                variant="secondary"
                className="mt-2.5"
                onPress={onMarkReceived}
                icon={<Feather name="check" size={14} color="#0E0F0C" />}
              />
            </>
          )}
        </View>
      </View>

      <View className="flex-row items-center my-1 mt-4">
        <Button title="Voltar" variant="primary" className="flex-1" onPress={onBack} />
        <View className="w-2" />
        <Button title="Editar" variant="primary-dark" className="flex-1" onPress={onEdit} />
      </View>
    </View>
  );
}
