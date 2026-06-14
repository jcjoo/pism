import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Button, Input } from '@/components';
import { Estado, Municipio } from '@/services/endereco.service';

interface LocationModalProps {
  visible:    boolean;
  type:       'estado' | 'cidade' | null;
  estados:    Estado[];
  cities:     Municipio[];
  searchTerm: string;
  onSearch:   (t: string) => void;
  onSelect:   (item: Estado | Municipio) => void;
  onClose:    () => void;
}

export function LocationModal({
  visible, type, estados, cities, searchTerm, onSearch, onSelect, onClose,
}: LocationModalProps) {
  const filteredCities = cities.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="modal-overlay-center">
        <View className="modal-panel-center">
          <Text className="modal-title">
            Selecione {type === 'estado' ? 'o Estado' : 'a Cidade'}
          </Text>
          {type === 'cidade' && (
            <Input
              placeholder="Digite o nome da cidade..."
              value={searchTerm}
              onChangeText={onSearch}
              className="mb-4"
            />
          )}
          <FlatList
            data={(type === 'estado' ? estados : filteredCities) as any[]}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity className="modal-item" onPress={() => onSelect(item)}>
                <Text className="text-base text-primary">{item.nome}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text className="empty-text">Nenhum item encontrado ou carregando...</Text>
            }
          />
          <Button title="Fechar" onPress={() => { onClose(); onSearch(''); }} variant="primary" />
        </View>
      </View>
    </Modal>
  );
}
