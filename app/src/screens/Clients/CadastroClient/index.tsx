import { Feather } from "@expo/vector-icons";
import { View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Modal, Text, FlatList } from "react-native";
import { Button, Input, Select, useToast } from "@/components";
import { useState, useEffect } from "react";
import { clientsService } from "@/services/clients.service";
import { enderecoService, Estado, Municipio } from "@/services/endereco.service";
import { Tables } from "@/types/database.types";

type ClientData = Partial<Tables<'clients'>> & {
  state?: string;
  city_name?: string;
  municipio?: any;
};

interface ClientProps {
  client: ClientData;
  step: string;
  onCancelCadastrar: () => void;
  onCadastrar: (item: ClientData) => void;
}

export default function CadastroClient({ client, step, onCancelCadastrar, onCadastrar }: ClientProps) {
  const toast = useToast();
  const [dadosClient, setDadosClient] = useState<ClientData>(client || {});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'estado' | 'cidade' | null>(null);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cities, setCities] = useState<Municipio[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const data = await enderecoService.getAllEstado();
        setEstados(data);
        const currentState = client?.municipio?.uf || client?.state;
        if (currentState) {
          const citiesData = await enderecoService.getMunicipiosByUF(currentState);
          setCities(citiesData);
        }
      } catch (error) {
        console.error("Erro ao buscar estados:", error);
        toast.show('Não foi possível carregar os estados.', { type: 'error' });
      }
    };
    fetchStates();
  }, [client]);

  const formatCPF = (value: string) =>
    value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');

  const formatPhone = (value: string) =>
    value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');

  const selectModalItem = (item: Estado | Municipio) => {
    if (modalType === 'estado') {
      const estado = item as Estado;
      setDadosClient(prev => ({ ...prev, state: estado.uf, municipio_id: undefined, municipio: undefined }));
      const fetchCities = async () => {
        try {
          const data = await enderecoService.getMunicipiosByUF(estado.uf);
          setCities(data);
        } catch (error) {
          toast.show('Não foi possível carregar as cidades.', { type: 'error' });
        }
      };
      fetchCities();
    } else if (modalType === 'cidade') {
      const cidade = item as Municipio;
      setDadosClient(prev => ({ ...prev, municipio_id: cidade.id, city_name: cidade.nome, municipio: cidade }));
    }
    setModalVisible(false);
    setSearchTerm('');
  };

  const onGravar = async () => {
    const { name, email, phone, address, municipio_id } = dadosClient;
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !address?.trim() || !municipio_id) {
      toast.show('Todos os campos são obrigatórios.', { type: 'error' });
      return;
    }
    try {
      const { city_name, state, municipio, ...payload } = dadosClient as any;
      if (step === 'edit') {
        await clientsService.updated(payload);
        toast.show('Cliente alterado com sucesso!', { type: 'success' });
        onCadastrar(dadosClient);
      } else if (step === 'register') {
        const newClientData = await clientsService.create(payload);
        toast.show('Cliente cadastrado com sucesso!', { type: 'success' });
        onCadastrar(newClientData);
      }
    } catch (error) {
      console.error("Erro ao gravar cliente:", error);
      toast.show('Erro ao gravar Cliente!', { type: 'error' });
    }
  };

  const filteredCities = cities.filter(city =>
    city.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <KeyboardAvoidingView
      className="screen px-6"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="form-card elevation-2">
          <Input
            label="Nome Completo"
            value={dadosClient.name}
            placeholder="Ex: João da Silva"
            onChangeText={(text) => setDadosClient(prev => ({ ...prev, name: text }))}
          />

          <Input
            label="E-mail"
            value={dadosClient.email || ''}
            keyboardType="email-address"
            placeholder="exemplo@email.com"
            onChangeText={(text) => setDadosClient(prev => ({ ...prev, email: text }))}
          />

          <View className="flex-row items-center">
            <View className="flex-1">
              <Input
                label="Telefone"
                value={formatPhone(dadosClient.phone?.toString() || '')}
                keyboardType="numeric"
                placeholder="(00) 00000-0000"
                onChangeText={(text) => {
                  const cleanText = text.replace(/\D/g, '');
                  setDadosClient(prev => ({ ...prev, phone: cleanText }));
                }}
              />
            </View>
            <View className="w-3" />
            <View className="flex-1">
              <Input
                label="CPF"
                value={formatCPF(dadosClient.cpf?.toString() || '')}
                keyboardType="numeric"
                placeholder="000.000.000-00"
                editable={step !== 'edit'}
                onChangeText={(text) => {
                  if (step !== 'edit') {
                    const cleanText = text.replace(/\D/g, '');
                    setDadosClient(prev => ({ ...prev, cpf: cleanText }));
                  }
                }}
              />
            </View>
          </View>

          <View className="flex-row items-center">
            <View className="flex-1">
              <Select
                label="Estado"
                placeholder="UF"
                value={dadosClient.municipio?.uf || dadosClient.state || ''}
                onPress={() => { setModalType('estado'); setModalVisible(true); }}
              />
            </View>
            <View className="w-3" />
            <View className="flex-[2]">
              <Select
                label="Cidade"
                placeholder="Selecione"
                value={dadosClient.municipio?.nome || dadosClient.city_name || ''}
                onPress={() => {
                  if (!dadosClient.state && !dadosClient.municipio?.uf) {
                    { toast.show('Selecione um estado primeiro!', { type: 'warning' }); return; }
                  }
                  setModalType('cidade');
                  setSearchTerm('');
                  setModalVisible(true);
                }}
              />
            </View>
          </View>

          <Input
            label="Endereço"
            value={dadosClient.address || ''}
            multiline
            numberOfLines={2}
            placeholder="Rua, número, bairro..."
            onChangeText={(text) => setDadosClient(prev => ({ ...prev, address: text }))}
          />
        </View>

        <View className="mt-6 mb-5">
          <Button
            title={step === 'edit' ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            variant="primary-dark"
            onPress={onGravar}
            icon={<Feather name="check" size={20} color="#EAE3F0" />}
          />
          <View className="h-3" />
          <Button title="Cancelar" variant="secondary" onPress={onCancelCadastrar} />
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="modal-overlay-center">
          <View className="modal-panel-center">
            <Text className="modal-title">
              Selecione {modalType === 'estado' ? 'o Estado' : 'a Cidade'}
            </Text>
            {modalType === 'cidade' && (
              <Input
                placeholder="Digite o nome da cidade..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                className="mb-4"
              />
            )}
            <FlatList
              data={(modalType === 'estado' ? estados : filteredCities) as any[]}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="modal-item"
                  onPress={() => selectModalItem(item)}
                >
                  <Text className="text-base text-primary">{item.nome}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text className="empty-text">Nenhum item encontrado ou carregando...</Text>
              }
            />
            <Button title="Fechar" onPress={() => { setModalVisible(false); setSearchTerm(''); }} variant="primary" />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
