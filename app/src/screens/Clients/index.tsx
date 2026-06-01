import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components';
import DetailsClient from './DetailsClient';
import CadastroClient from './CadastroClient';

import { clientsService, Client } from '@/services/clients.service';
import { useNavigation } from '@react-navigation/native';

type Step = 'filter' | 'register' | 'details' | 'edit';

export function Clients() {
  const navigation = useNavigation();
  const [clientList, setClientsList] = useState<Client[]>([]);
  const [archivedList, setArchivedList] = useState<Client[]>([]);
  const [clientSelected, setClientSelected] = useState<Client | null>(null);
  const [step, setStep] = useState<Step>('filter');

  const loadData = async () => {
    try {
      const active = await clientsService.getAll(false);
      setClientsList(active);
      const archived = await clientsService.getAll(true);
      setArchivedList(archived.filter((c: any) => c.is_archived));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    if (step === 'filter') loadData();
  }, [step]);

  const cancelCadastrar = () => {
    setClientSelected(null);
    setStep('filter');
  };

  const cadastrarItem = (item?: any) => {
    setClientSelected(item);
    setStep('details');
  };

  const handleUnarchive = async (id: string) => {
    try {
      await clientsService.unarchive(id);
      Alert.alert('Sucesso', 'Cliente desarquivado!');
      loadData();
    } catch (error) {
      console.error('Erro ao desarquivar:', error);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientSelected) return;

    try {
      const hasSales = await clientsService.hasSales(clientSelected.id);

      if (hasSales) {
        Alert.alert(
          'Arquivar Cliente',
          'Este cliente possui vendas vinculadas e não pode ser excluído. Deseja arquivá-lo?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Arquivar', onPress: async () => {
                try {
                  await clientsService.archive(clientSelected.id);
                  Alert.alert('Sucesso', 'Cliente arquivado com sucesso!');
                  setStep('filter');
                } catch (error) {
                  Alert.alert('Erro', 'Não foi possível arquivar o cliente.');
                }
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Excluir Cliente',
          `Tem certeza que deseja excluir o cliente ${clientSelected.name}?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Excluir', style: 'destructive', onPress: async () => {
                try {
                  await clientsService.delete(clientSelected.id);
                  Alert.alert('Sucesso', 'Cliente excluído com sucesso!');
                  setStep('filter');
                } catch (error) {
                  Alert.alert('Erro', 'Não foi possível excluir o cliente.');
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível verificar as vendas do cliente.');
    }
  };

  const PageHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <View className="page-header justify-between">
      <View className="flex-row items-center">
        <TouchableOpacity onPress={onBack} className="mr-3 p-1">
          <Feather name="chevron-left" size={28} color="#3C096C" />
        </TouchableOpacity>
        <Text className="page-title">{title}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      className="screen"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {step === 'filter' && (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <PageHeader title="Clientes" onBack={() => navigation.goBack()} />

          <Button
            title="Novo Cliente"
            variant="secondary"
            className="mx-5 mb-5"
            onPress={() => { setClientSelected(null); setStep('register'); }}
            icon={<Feather name="user-plus" size={20} color="#EAE3F0" />}
          />

          <View className="px-5 mb-3">
            <Text className="section-title">Ativos ({clientList.length})</Text>
          </View>

          {clientList.map((item) => (
            <TouchableOpacity
              key={item.id}
              className="entity-card mx-5 mb-3 elevation-2"
              onPress={() => { setClientSelected(item); setStep('details'); }}
            >
              <View className="icon-avatar-sm">
                <Feather name="user" size={24} color="#5A189A" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-primary-dark mb-1">{item.name}</Text>
                <Text className="text-[13px] text-primary-light">
                  {item.cpf ? `CPF: ${item.cpf}` : 'Sem CPF'} • {(item as any).municipio?.nome || 'Sem Cidade'}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#8B5A96" />
            </TouchableOpacity>
          ))}

          {archivedList.length > 0 && (
            <>
              <View className="px-5 mt-6 mb-3">
                <Text className="section-title text-primary-light">Arquivados ({archivedList.length})</Text>
              </View>
              {archivedList.map((item) => (
                <View
                  key={item.id}
                  className="entity-card mx-5 mb-3 opacity-60"
                >
                  <View className="icon-avatar-sm">
                    <Feather name="archive" size={24} color="#8B5A96" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-primary-dark mb-1">{item.name}</Text>
                    <Text className="text-[13px] text-primary-light">Arquivado</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleUnarchive(item.id)}
                    className="unarchive-btn"
                  >
                    <Feather name="refresh-cw" size={20} color="#758C36" />
                    <Text className="text-[10px] text-secondary-dark font-bold mt-0.5">Restaurar</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
          <View className="h-10" />
        </ScrollView>
      )}

      {step === 'details' && (
        <View className="flex-1">
          <PageHeader title="Detalhes" onBack={() => setStep('filter')} />
          <DetailsClient
            client={(clientSelected || {}) as any}
            onCancelEditar={cancelCadastrar}
            onEditarProduto={() => setStep('edit')}
            onDeletarCliente={handleDeleteClient}
          />
        </View>
      )}

      {(step === 'edit' || step === 'register') && (
        <View className="flex-1">
          <PageHeader
            title={step === 'edit' ? 'Editar Cliente' : 'Novo Cliente'}
            onBack={() => setStep('filter')}
          />
          <CadastroClient
            client={(clientSelected || {}) as any}
            step={step}
            onCancelCadastrar={cancelCadastrar}
            onCadastrar={(item) => cadastrarItem(item)}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
