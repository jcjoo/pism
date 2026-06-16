import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  TextInput, Modal, KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, useToast } from '@/components';
import { enderecoService, Estado, Municipio } from '@/services/endereco.service';
import { colors } from '@/theme/color';

interface AddCidadeModalProps {
  visible:  boolean;
  estados:  Estado[];
  onClose:  () => void;
  onSaved:  (m: Municipio) => void;
}

export function AddCidadeModal({ visible, estados, onClose, onSaved }: AddCidadeModalProps) {
  const toast = useToast();
  const [estadoSearch, setEstadoSearch]     = useState('');
  const [selectedEstado, setSelectedEstado] = useState<Estado | null>(null);
  const [nomeCidade, setNomeCidade]         = useState('');
  const [saving, setSaving]                 = useState(false);
  const [step, setStep]                     = useState<'estado' | 'cidade'>('estado');

  const reset = () => {
    setEstadoSearch('');
    setSelectedEstado(null);
    setNomeCidade('');
    setStep('estado');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSelectEstado = (e: Estado) => {
    setSelectedEstado(e);
    setStep('cidade');
  };

  const handleSave = async () => {
    if (!selectedEstado || !nomeCidade.trim()) {
      toast.show('Preencha o nome da cidade.', { type: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const municipio = await enderecoService.createMunicipio(
        nomeCidade.trim(), selectedEstado.id, selectedEstado.uf,
      );
      toast.show(`${municipio.nome} adicionada!`, { type: 'success' });
      onSaved(municipio);
      reset();
    } catch (e: any) {
      toast.show(e.message ?? 'Erro ao salvar cidade.', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filteredEstados = estados.filter(e =>
    e.nome.toLowerCase().includes(estadoSearch.toLowerCase()) ||
    e.uf.toLowerCase().includes(estadoSearch.toLowerCase()),
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
          onPress={handleClose}
        />
        <View style={{
            backgroundColor: '#F8F5FC', borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 40,
          }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#D5CBE0' }} />
            </View>

            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary.dark, marginBottom: 16 }}>
              {step === 'estado' ? 'Selecione o Estado' : `Nova cidade em ${selectedEstado?.uf}`}
            </Text>

            {step === 'estado' ? (
              <>
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
                    value={estadoSearch}
                    onChangeText={setEstadoSearch}
                    autoFocus
                  />
                </View>
                <FlatList
                  data={filteredEstados}
                  keyExtractor={e => e.id.toString()}
                  style={{ maxHeight: 300 }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => handleSelectEstado(item)}
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
                      <Feather name="chevron-right" size={16} color={colors.primary.light} />
                    </TouchableOpacity>
                  )}
                />
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setStep('estado')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}
                >
                  <Feather name="arrow-left" size={16} color={colors.primary.main} />
                  <Text style={{ fontSize: 13, color: colors.primary.main, fontWeight: '600' }}>
                    {selectedEstado?.nome}
                  </Text>
                </TouchableOpacity>

                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary.dark, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                  Nome da cidade
                </Text>
                <View style={{
                  backgroundColor: colors.light.dark, borderRadius: 10,
                  paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20,
                }}>
                  <TextInput
                    style={{ fontSize: 16, color: '#1A0030' }}
                    placeholder="Ex: Belo Horizonte"
                    placeholderTextColor={colors.primary.light}
                    value={nomeCidade}
                    onChangeText={setNomeCidade}
                    autoFocus
                    autoCapitalize="words"
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button title="Cancelar" variant="primary-dark" className="flex-1" onPress={handleClose} disabled={saving} />
                  <Button
                    title={saving ? 'Salvando...' : 'Adicionar'}
                    variant="secondary"
                    className="flex-[1.4]"
                    onPress={handleSave}
                    disabled={saving}
                    icon={saving ? undefined : <Feather name="plus" size={16} color={colors.dark.main} />}
                  />
                </View>
              </>
            )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
