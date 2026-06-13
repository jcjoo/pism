import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Modal,
  TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, useToast } from '@/components';
import { enderecoService, Estado, Municipio } from '@/services/endereco.service';
import { supabase } from '@/services/supabase';

// ── helpers ───────────────────────────────────────────────────────────────────

async function clientCountForMunicipio(id: number): Promise<number> {
  const { count } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('municipio_id', id);
  return count ?? 0;
}

// ── AddCidadeModal ────────────────────────────────────────────────────────────

interface AddModalProps {
  visible:  boolean;
  estados:  Estado[];
  onClose:  () => void;
  onSaved:  (m: Municipio) => void;
}

function AddCidadeModal({ visible, estados, onClose, onSaved }: AddModalProps) {
  const toast = useToast();
  const [estadoSearch, setEstadoSearch] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<Estado | null>(null);
  const [nomeCidade, setNomeCidade] = useState('');
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'estado' | 'cidade'>('estado');

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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
          activeOpacity={1}
          onPress={handleClose}
        />
        <TouchableOpacity
          activeOpacity={1}
          style={{
            backgroundColor: '#F8F5FC', borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 40, maxHeight: '80%',
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#D5CBE0' }} />
          </View>

          <Text style={{ fontSize: 18, fontWeight: '700', color: '#3C096C', marginBottom: 16 }}>
            {step === 'estado' ? 'Selecione o Estado' : `Nova cidade em ${selectedEstado?.uf}`}
          </Text>

          {step === 'estado' ? (
            <>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: '#E1DAE8', borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
              }}>
                <Feather name="search" size={15} color="#5A189A" />
                <TextInput
                  style={{ flex: 1, fontSize: 14, color: '#3C096C' }}
                  placeholder="Buscar estado..."
                  placeholderTextColor="#8B5A96"
                  value={estadoSearch}
                  onChangeText={setEstadoSearch}
                  autoFocus
                />
              </View>
              <FlatList
                data={filteredEstados}
                keyExtractor={e => e.id.toString()}
                style={{ maxHeight: 340 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectEstado(item)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#E1DAE8',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{
                        width: 36, height: 36, borderRadius: 8,
                        backgroundColor: '#EAE3F0', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#3C096C' }}>{item.uf}</Text>
                      </View>
                      <Text style={{ fontSize: 15, color: '#3C096C' }}>{item.nome}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#8B5A96" />
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
                <Feather name="arrow-left" size={16} color="#5A189A" />
                <Text style={{ fontSize: 13, color: '#5A189A', fontWeight: '600' }}>
                  {selectedEstado?.nome}
                </Text>
              </TouchableOpacity>

              <Text style={{ fontSize: 11, fontWeight: '700', color: '#3C096C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                Nome da cidade
              </Text>
              <View style={{
                backgroundColor: '#E1DAE8', borderRadius: 10,
                paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20,
              }}>
                <TextInput
                  style={{ fontSize: 16, color: '#1A0030' }}
                  placeholder="Ex: Belo Horizonte"
                  placeholderTextColor="#8B5A96"
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
                  icon={saving ? undefined : <Feather name="plus" size={16} color="#0E0F0C" />}
                />
              </View>
            </>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function Regioes() {
  const toast = useToast();
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [estados, setEstados]       = useState<Estado[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [deleting, setDeleting]     = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ms, es] = await Promise.all([
        enderecoService.getAllMunicipios(),
        enderecoService.getAllEstado(),
      ]);
      setMunicipios(ms);
      setEstados(es);
    } catch {
      toast.show('Erro ao carregar cidades.', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, { estado: Estado | undefined; cidades: Municipio[] }>();
    municipios.forEach(m => {
      if (!map.has(m.uf)) {
        map.set(m.uf, {
          estado: estados.find(e => e.uf === m.uf),
          cidades: [],
        });
      }
      map.get(m.uf)!.cidades.push(m);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([uf, data]) => ({ uf, ...data }));
  }, [municipios, estados]);

  const handleDelete = async (m: Municipio) => {
    setDeleting(m.id);
    try {
      const count = await clientCountForMunicipio(m.id);
      if (count > 0) {
        toast.show(`${m.nome} tem ${count} cliente${count > 1 ? 's' : ''} — remova-os primeiro.`, { type: 'warning' });
        return;
      }
      await enderecoService.deleteMunicipio(m.id);
      setMunicipios(prev => prev.filter(c => c.id !== m.id));
      toast.show(`${m.nome} removida.`, { type: 'success' });
    } catch (e: any) {
      toast.show(e.message ?? 'Erro ao remover cidade.', { type: 'error' });
    } finally {
      setDeleting(null);
    }
  };

  const handleSaved = (m: Municipio) => {
    setMunicipios(prev => [...prev, m].sort((a, b) => a.nome.localeCompare(b.nome)));
    setShowAdd(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F5FC' }}>
      {/* Header summary */}
      <View style={{ backgroundColor: '#3C096C', paddingHorizontal: 20, paddingVertical: 16 }}>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 2 }}>
          {municipios.length} {municipios.length === 1 ? 'cidade cadastrada' : 'cidades cadastradas'}
          {grouped.length > 0 ? ` em ${grouped.length} estado${grouped.length > 1 ? 's' : ''}` : ''}
        </Text>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
          Regiões de Trabalho
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#5A189A" />
        </View>
      ) : municipios.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Feather name="map" size={52} color="#C4B5D0" />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#8B5A96', marginTop: 16, textAlign: 'center' }}>
            Nenhuma cidade cadastrada
          </Text>
          <Text style={{ fontSize: 13, color: '#B09DC0', marginTop: 6, textAlign: 'center' }}>
            Adicione as cidades onde você realiza suas vendas.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {grouped.map(({ uf, estado, cidades }) => (
            <View key={uf} style={{ marginBottom: 20 }}>
              {/* State header */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                paddingVertical: 8, paddingHorizontal: 4, marginBottom: 4,
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 8,
                  backgroundColor: '#3C096C', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{uf}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#3C096C' }}>
                    {estado?.nome ?? uf}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#8B5A96' }}>
                    {cidades.length} {cidades.length === 1 ? 'cidade' : 'cidades'}
                  </Text>
                </View>
              </View>

              {/* Cities */}
              <View style={{
                backgroundColor: '#fff', borderRadius: 14,
                borderWidth: 1, borderColor: '#E1DAE8', overflow: 'hidden',
              }}>
                {cidades.map((cidade, i) => (
                  <View
                    key={cidade.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 16, paddingVertical: 14,
                      borderBottomWidth: i < cidades.length - 1 ? 1 : 0,
                      borderBottomColor: '#F0EBF8',
                    }}
                  >
                    <Feather name="map-pin" size={15} color="#8B5A96" style={{ marginRight: 12 }} />
                    <Text style={{ flex: 1, fontSize: 15, color: '#1A0030', fontWeight: '500' }}>
                      {cidade.nome}
                    </Text>
                    {deleting === cidade.id ? (
                      <ActivityIndicator size="small" color="#DF1515" />
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleDelete(cidade)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Feather name="trash-2" size={16} color="#C4B5D0" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setShowAdd(true)}
        style={{
          position: 'absolute', bottom: 32, right: 24,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: '#758C36', alignItems: 'center', justifyContent: 'center',
          elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2, shadowRadius: 6,
        }}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>

      <AddCidadeModal
        visible={showAdd}
        estados={estados}
        onClose={() => setShowAdd(false)}
        onSaved={handleSaved}
      />
    </View>
  );
}
