import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  TextInput, Modal, KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components';
import { Estado } from '@/services/endereco.service';
import { colors } from '@/theme/color';

interface SelectEstadosModalProps {
  visible:  boolean;
  estados:  Estado[];
  selected: string[];
  onClose:  () => void;
  onSave:   (ufs: string[]) => void;
}

export function SelectEstadosModal({ visible, estados, selected, onClose, onSave }: SelectEstadosModalProps) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<string[]>(selected);

  useEffect(() => {
    if (visible) {
      setPicked(selected);
      setSearch('');
    }
  }, [visible, selected]);

  const toggle = (uf: string) => {
    setPicked(prev => prev.includes(uf) ? prev.filter(u => u !== uf) : [...prev, uf]);
  };

  const filtered = estados.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.uf.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={{
          backgroundColor: '#F8F5FC', borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 24, paddingBottom: 40,
        }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#D5CBE0' }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary.dark }}>
              Selecionar Estados
            </Text>
            <TouchableOpacity onPress={() => setPicked(picked.length === estados.length ? [] : estados.map(e => e.uf))}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary.main }}>
                {picked.length === estados.length ? 'Limpar tudo' : 'Selecionar tudo'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: colors.light.dark, borderRadius: 10,
            paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
          }}>
            <Feather name="search" size={15} color={colors.primary.main} />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: colors.primary.dark }}
              placeholder="Buscar estado..."
              placeholderTextColor={colors.primary.light}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={e => e.id.toString()}
            style={{ maxHeight: 320 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isPicked = picked.includes(item.uf);
              return (
                <TouchableOpacity
                  onPress={() => toggle(item.uf)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.light.dark,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{
                      width: 36, height: 36, borderRadius: 8,
                      backgroundColor: colors.light.main, alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary.dark }}>{item.uf}</Text>
                    </View>
                    <Text style={{ fontSize: 15, color: colors.primary.dark }}>{item.nome}</Text>
                  </View>
                  <Feather
                    name={isPicked ? 'check-square' : 'square'}
                    size={20}
                    color={isPicked ? colors.primary.main : '#C4B5D0'}
                  />
                </TouchableOpacity>
              );
            }}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Button title="Cancelar" variant="primary-dark" className="flex-1" onPress={onClose} />
            <Button
              title="Salvar"
              variant="secondary"
              className="flex-[1.4]"
              onPress={() => onSave(picked)}
              icon={<Feather name="check" size={16} color={colors.dark.main} />}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
