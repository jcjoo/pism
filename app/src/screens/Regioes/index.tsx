import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, useToast } from '@/components';
import { enderecoService, Estado, Municipio } from '@/services/endereco.service';
import { supabase } from '@/services/supabase';
import { storageService, STORAGE_KEYS } from '@/services/storage.service';
import { useNavigation } from '@react-navigation/native';
import { AddCidadeModal } from './AddCidadeModal';
import { SelectEstadosModal } from './SelectEstadosModal';
import { colors } from '@/theme/color';

async function clientCountForMunicipio(id: number): Promise<number> {
  const { count } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('municipio_id', id);
  return count ?? 0;
}

export function Regioes() {
  const navigation = useNavigation();
  const toast = useToast();
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [estados, setEstados]       = useState<Estado[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [deleting, setDeleting]     = useState<number | null>(null);
  const [showSelectEstados, setShowSelectEstados] = useState(false);
  const [estadosFilter, setEstadosFilter] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ms, es, filter] = await Promise.all([
        enderecoService.getAllMunicipios(),
        enderecoService.getAllEstado(),
        storageService.getItem<string[]>(STORAGE_KEYS.REGIOES_ESTADOS_FILTER),
      ]);
      setMunicipios(ms);
      setEstados(es);
      setEstadosFilter(filter);
    } catch {
      toast.show('Erro ao carregar cidades.', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveEstadosFilter = async (ufs: string[]) => {
    setEstadosFilter(ufs);
    setShowSelectEstados(false);
    await storageService.setItem(STORAGE_KEYS.REGIOES_ESTADOS_FILTER, ufs);
  };

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
      .filter(([uf]) => estadosFilter === null || estadosFilter.includes(uf))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([uf, data]) => ({ uf, ...data }));
  }, [municipios, estados, estadosFilter]);

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
    <KeyboardAvoidingView
      className="screen"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="page-header">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1">
            <Feather name="chevron-left" size={28} color={colors.primary.dark} />
          </TouchableOpacity>
          <Text className="page-title">Regiões</Text>
        </View>

        <View className="flex-row mx-5 mb-5" style={{ gap: 10 }}>
          <Button
            title="Nova Cidade"
            variant="secondary"
            className="flex-1"
            onPress={() => setShowAdd(true)}
            icon={<Feather name="map-pin" size={20} color={colors.light.main} />}
          />
          <TouchableOpacity
            onPress={() => setShowSelectEstados(true)}
            style={{
              width: 48, alignItems: 'center', justifyContent: 'center',
              borderRadius: 12, backgroundColor: colors.light.main,
            }}
          >
            <Feather name="filter" size={20} color={colors.primary.main} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary.main} />
          </View>
        ) : municipios.length === 0 ? (
          <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 }}>
            <Feather name="map" size={52} color="#C4B5D0" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary.light, marginTop: 16, textAlign: 'center' }}>
              Nenhuma cidade cadastrada
            </Text>
            <Text style={{ fontSize: 13, color: '#B09DC0', marginTop: 6, textAlign: 'center' }}>
              Adicione as cidades onde você realiza suas vendas.
            </Text>
          </View>
        ) : grouped.length === 0 ? (
          <View style={{ paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 }}>
            <Feather name="filter" size={52} color="#C4B5D0" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary.light, marginTop: 16, textAlign: 'center' }}>
              Nenhum estado selecionado
            </Text>
            <Text style={{ fontSize: 13, color: '#B09DC0', marginTop: 6, textAlign: 'center' }}>
              Toque no filtro para escolher quais estados aparecem.
            </Text>
          </View>
        ) : (
          <>
            {grouped.map(({ uf, estado, cidades }) => (
              <View key={uf} className="px-5 mb-4">
                <Text className="section-title mb-2">
                  {estado?.nome ?? uf} · {cidades.length} {cidades.length === 1 ? 'cidade' : 'cidades'}
                </Text>

                {cidades.map((cidade) => (
                  <View
                    key={cidade.id}
                    className="entity-card mb-3"
                  >
                    <View className="icon-avatar-sm">
                      <Feather name="map-pin" size={20} color={colors.primary.main} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-primary-dark">{cidade.nome}</Text>
                      <Text className="text-[13px] text-primary-light">{uf}</Text>
                    </View>
                    {deleting === cidade.id ? (
                      <ActivityIndicator size="small" color={colors.danger.main} />
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleDelete(cidade)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Feather name="trash-2" size={18} color="#C4B5D0" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        <View className="h-10" />
      </ScrollView>

      <AddCidadeModal
        visible={showAdd}
        estados={estados}
        onClose={() => setShowAdd(false)}
        onSaved={handleSaved}
      />

      <SelectEstadosModal
        visible={showSelectEstados}
        estados={estados}
        selected={estadosFilter ?? estados.map(e => e.uf)}
        onClose={() => setShowSelectEstados(false)}
        onSave={handleSaveEstadosFilter}
      />
    </KeyboardAvoidingView>
  );
}
