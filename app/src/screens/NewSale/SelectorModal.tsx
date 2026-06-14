import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Button } from '@/components';
import { Client } from '@/services/clients.service';
import { Product } from '@/services/products.service';

interface SelectorModalProps {
  visible:   boolean;
  type:      'cliente' | 'product';
  clients:   Client[];
  products:  Product[];
  onSelect:  (item: any) => void;
  onClose:   () => void;
}

export function SelectorModal({ visible, type, clients, products, onSelect, onClose }: SelectorModalProps) {
  const isClient = type === 'cliente';
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="modal-overlay-center">
        <View className="modal-panel-center">
          <Text className="modal-title">
            Selecione o {isClient ? 'Cliente' : 'Produto'}
          </Text>
          <FlatList
            data={(isClient ? clients : products) as any[]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity className="modal-item" onPress={() => onSelect(item)}>
                <Text className="text-base text-primary">{item.name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text className="empty-text">Nenhum item encontrado no banco.</Text>
            }
          />
          <Button title="Fechar" onPress={onClose} variant="primary" />
        </View>
      </View>
    </Modal>
  );
}
