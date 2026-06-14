import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components';
import { PendingSale } from '@/services/recebimentos.service';
import {
  saleTotal, renderPrice, formatDate,
  installmentCount, pendingInstallments, sortedInstallments, getDays, getStatus, STATUS,
} from './helpers';

interface InstallmentModalProps {
  sale:      PendingSale | null;
  onClose:   () => void;
  onConfirm: (ids: string[]) => Promise<void>;
  saving:    boolean;
}

export function InstallmentModal({ sale, onClose, onConfirm, saving }: InstallmentModalProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!sale) return;
    const pending     = pendingInstallments(sale);
    const autoSelect  = pending.filter(i => getDays(i.due_date) <= 0);
    const preSelected = autoSelect.length > 0 ? autoSelect : pending.slice(0, 1);
    setCheckedIds(new Set(preSelected.map(i => i.id)));
  }, [sale?.id]);

  if (!sale) return null;

  const all           = sortedInstallments(sale);
  const selectedTotal = all
    .filter(i => checkedIds.has(i.id))
    .reduce((a, i) => a + i.amount, 0);

  const toggle = (id: string) =>
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <Modal visible={!!sale} transparent animationType="slide">
      <TouchableOpacity
        className="modal-overlay-bottom"
        activeOpacity={1}
        onPress={() => !saving && onClose()}
      >
        <TouchableOpacity activeOpacity={1} className="modal-sheet-bottom">
          <View className="-mx-6 -mt-6 px-6 pt-5 pb-4 mb-3 bg-light rounded-t-3xl border-t-4 border-t-primary-dark">
            <Text className="text-lg font-bold text-primary-dark">{sale.clients?.name}</Text>
            <Text className="text-[12px] text-primary mt-0.5">
              {installmentCount(sale)}x · Total da venda: {renderPrice(saleTotal(sale))}
            </Text>
            {!!sale.observation && (
              <View className="flex-row items-start gap-1.5 mt-2 bg-white/70 rounded-[8px] px-3 py-2">
                <Feather name="message-square" size={13} color="#5A189A" style={{ marginTop: 1 }} />
                <Text className="text-[13px] text-primary-dark italic flex-1">{sale.observation}</Text>
              </View>
            )}
          </View>

          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {all.map(inst => {
              const isReceived = !!inst.received_at;
              const isChecked  = checkedIds.has(inst.id);
              const days       = getDays(inst.due_date);
              const st         = getStatus(inst.due_date);
              const color      = isReceived ? '#1B8A3D' : STATUS[st].color;

              return (
                <TouchableOpacity
                  key={inst.id}
                  disabled={isReceived || saving}
                  onPress={() => toggle(inst.id)}
                  className="flex-row items-center py-3 border-b border-light-dark"
                  style={{ opacity: isReceived ? 0.45 : 1 }}
                  activeOpacity={0.7}
                >
                  <View
                    className="w-[22px] h-[22px] rounded-[5px] border-2 items-center justify-center mr-3"
                    style={{
                      borderColor:     isReceived ? '#1B8A3D' : isChecked ? '#3C096C' : '#C4B5D0',
                      backgroundColor: isReceived ? '#E6F7EC' : isChecked ? '#3C096C' : 'transparent',
                    }}
                  >
                    {(isReceived || isChecked) && (
                      <Feather name="check" size={12} color={isReceived ? '#1B8A3D' : '#fff'} />
                    )}
                  </View>

                  <View className="flex-1">
                    <Text className="text-[13px] font-bold text-primary-dark">
                      Parcela {inst.installment_number}/{installmentCount(sale)}
                    </Text>
                    <Text className="text-[11px] text-primary mt-0.5">
                      {isReceived
                        ? `Recebida em ${formatDate(inst.received_at)}`
                        : formatDate(inst.due_date) +
                          (days < 0 ? ` · ${Math.abs(days)}d atraso` : days === 0 ? ' · Hoje' : '')}
                    </Text>
                  </View>

                  <View className="items-end">
                    <Text className="text-[14px] font-bold text-primary-dark">{renderPrice(inst.amount)}</Text>
                    {!isReceived && (
                      <View className="px-1.5 py-0.5 rounded-full mt-0.5" style={{ backgroundColor: color }}>
                        <Text className="text-[9px] font-bold text-white">
                          {days < 0 ? 'Atrasada' : days === 0 ? 'Hoje' : `Em ${days}d`}
                        </Text>
                      </View>
                    )}
                    {isReceived && (
                      <Feather name="check-circle" size={13} color="#1B8A3D" style={{ marginTop: 2 }} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View className="flex-row justify-between items-center py-2.5 mt-1 border-t border-light-dark">
            <Text className="text-[13px] text-primary">
              {checkedIds.size > 0
                ? `${checkedIds.size} parcela${checkedIds.size > 1 ? 's' : ''} selecionada${checkedIds.size > 1 ? 's' : ''}`
                : 'Selecione as parcelas a receber'}
            </Text>
            {checkedIds.size > 0 && (
              <Text className="text-base font-bold text-secondary-dark">{renderPrice(selectedTotal)}</Text>
            )}
          </View>

          <View className="flex-row mt-2">
            <Button
              title="Cancelar"
              variant="primary-dark"
              className="flex-1 mr-1.5"
              onPress={onClose}
              disabled={saving}
            />
            <Button
              title={saving ? 'Salvando...' : `Confirmar${checkedIds.size > 0 ? ` (${checkedIds.size})` : ''}`}
              variant="secondary"
              className="flex-[1.5]"
              onPress={() => onConfirm([...checkedIds])}
              disabled={saving || checkedIds.size === 0}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
