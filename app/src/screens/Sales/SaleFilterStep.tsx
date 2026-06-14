import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Select } from '@/components';
import { Client } from '@/services/clients.service';
import { Product } from '@/services/products.service';
import { StatusFilter } from './types';
import { formatDate } from './helpers';

interface SaleFilterStepProps {
  filterClient:    Client | null;
  filterProduct:   Product | null;
  statusFilter:    StatusFilter;
  dateStart:       Date | null;
  dateEnd:         Date | null;
  dueStart:        Date | null;
  dueEnd:          Date | null;
  loading:         boolean;
  onOpenModal:     (type: 'cliente' | 'product') => void;
  onOpenDate:      (target: string) => void;
  onSetStatus:     (s: StatusFilter) => void;
  onSearch:        () => void;
  onClear:         () => void;
}

function StatusChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
        backgroundColor: active ? '#3C096C' : '#E1DAE8',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : '#3C096C' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function SaleFilterStep({
  filterClient, filterProduct, statusFilter,
  dateStart, dateEnd, dueStart, dueEnd,
  loading, onOpenModal, onOpenDate, onSetStatus, onSearch, onClear,
}: SaleFilterStepProps) {
  return (
    <View>
      <Select
        label="Cliente"
        value={filterClient?.name || ''}
        placeholder="Todos os Clientes"
        onPress={() => onOpenModal('cliente')}
      />
      <Select
        label="Mercadoria"
        value={filterProduct?.name || ''}
        placeholder="Todas as Mercadorias"
        onPress={() => onOpenModal('product')}
      />

      <Text className="label-upper mt-3">Período da Venda</Text>
      <View className="flex-row items-center">
        <Select label="De" value={formatDate(dateStart)} placeholder="—" onPress={() => onOpenDate('dateStart')} className="flex-1" />
        <View className="w-2" />
        <Select label="Até" value={formatDate(dateEnd)} placeholder="—" onPress={() => onOpenDate('dateEnd')} className="flex-1" />
      </View>

      <Text className="label-upper mt-2">Período de Vencimento</Text>
      <View className="flex-row items-center">
        <Select label="De" value={formatDate(dueStart)} placeholder="—" onPress={() => onOpenDate('dueStart')} className="flex-1" />
        <View className="w-2" />
        <Select label="Até" value={formatDate(dueEnd)} placeholder="—" onPress={() => onOpenDate('dueEnd')} className="flex-1" />
      </View>

      <Text className="label-upper mt-3">Status do recebimento</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        <StatusChip label="Todos"      active={statusFilter === 'all'}      onPress={() => onSetStatus('all')}      />
        <StatusChip label="A receber"  active={statusFilter === 'pending'}   onPress={() => onSetStatus('pending')}  />
        <StatusChip label="Recebidos"  active={statusFilter === 'received'}  onPress={() => onSetStatus('received')} />
      </View>

      <View className="flex-row items-center my-1 mt-4">
        <Button title="Limpar" variant="primary-dark" className="flex-1" onPress={onClear} />
        <View className="w-2" />
        <Button
          title={loading ? 'Buscando...' : 'Consultar'}
          variant="secondary"
          className="flex-1"
          onPress={onSearch}
          disabled={loading}
          icon={loading ? undefined : <Feather name="search" size={15} color="#0E0F0C" />}
        />
      </View>
    </View>
  );
}
