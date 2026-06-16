import { Feather } from "@expo/vector-icons";
import { View } from "react-native";
import { Button, Input, Select, FormScrollView, useToast } from "@/components";
import { useState, useEffect, useRef, useCallback } from "react";
import { clientsService } from "@/services/clients.service";
import { enderecoService, Estado, Municipio } from "@/services/endereco.service";
import { geocodingService, AddressSuggestion } from "@/services/geocoding.service";
import { ClientData, GeoStatus } from "./types";
import { GeoBadge } from "./GeoBadge";
import { AddressInput } from "./AddressInput";
import { LocationModal } from "./LocationModal";
import { colors } from '@/theme/color';

interface ClientProps {
  client: ClientData;
  step: string;
  onCancelCadastrar: () => void;
  onCadastrar: (item: ClientData) => void;
}

export default function CadastroClient({ client, step, onCancelCadastrar, onCadastrar }: ClientProps) {
  const toast = useToast();
  const [dadosClient, setDadosClient]           = useState<ClientData>(client || {});
  const [modalVisible, setModalVisible]         = useState(false);
  const [modalType, setModalType]               = useState<'estado' | 'cidade' | null>(null);
  const [estados, setEstados]                   = useState<Estado[]>([]);
  const [cities, setCities]                     = useState<Municipio[]>([]);
  const [searchTerm, setSearchTerm]             = useState('');
  const [geoStatus, setGeoStatus]               = useState<GeoStatus>(() =>
    client?.latitude != null && client?.longitude != null ? 'address' : 'idle'
  );
  const [suggestions, setSuggestions]           = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions]   = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geoSeqRef   = useRef(0);
  const sugSeqRef   = useRef(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await enderecoService.getAllEstado();
        setEstados(data);
        const uf = client?.municipio?.uf || client?.state;
        if (uf) setCities(await enderecoService.getMunicipiosByUF(uf));
      } catch {
        toast.show('Não foi possível carregar os estados.', { type: 'error' });
      }
    };
    fetch();
  }, [client]);

  const runGeocode = useCallback(async (address: string, city: string, uf: string) => {
    const seq = ++geoSeqRef.current;
    setGeoStatus('loading');
    const addressResult = address.trim().length >= 5
      ? await geocodingService.byAddress(address, city, uf) : null;
    if (seq !== geoSeqRef.current) return;
    if (addressResult) {
      setDadosClient(prev => ({ ...prev, latitude: addressResult.lat, longitude: addressResult.lon }));
      setGeoStatus('address'); return;
    }
    const cityResult = await geocodingService.byCity(city, uf);
    if (seq !== geoSeqRef.current) return;
    if (cityResult) {
      setDadosClient(prev => ({ ...prev, latitude: cityResult.lat, longitude: cityResult.lon }));
      setGeoStatus('city');
    } else {
      setDadosClient(prev => ({ ...prev, latitude: undefined, longitude: undefined }));
      setGeoStatus('none');
    }
  }, []);

  const scheduleGeocode = useCallback((address: string, city: string, uf: string) => {
    if (!city || !uf) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runGeocode(address, city, uf), 900);
  }, [runGeocode]);

  const fetchSuggestions = useCallback(async (text: string, city: string, uf: string) => {
    if (text.trim().length < 4) { setSuggestions([]); setShowSuggestions(false); return; }
    const seq = ++sugSeqRef.current;
    setSuggestionsLoading(true);
    const results = await geocodingService.suggestions(text, city, uf);
    if (seq !== sugSeqRef.current) return;
    setSuggestionsLoading(false);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
  }, []);

  const scheduleSuggestions = useCallback((text: string, city: string, uf: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text, city, uf), 500);
  }, [fetchSuggestions]);

  const handleAddressChange = (text: string) => {
    setDadosClient(prev => ({ ...prev, address: text }));
    const city = dadosClient.municipio?.nome || dadosClient.city_name || '';
    const uf   = dadosClient.municipio?.uf   || dadosClient.state     || '';
    scheduleSuggestions(text, city, uf);
    if (!text.trim() && city && uf) {
      ++geoSeqRef.current;
      runGeocode('', city, uf);
    }
  };

  const handleSelectSuggestion = async (s: AddressSuggestion) => {
    setShowSuggestions(false); setSuggestions([]);
    ++sugSeqRef.current; ++geoSeqRef.current;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDadosClient(prev => ({ ...prev, address: s.addressText || s.displayName, latitude: s.lat, longitude: s.lon }));
    setGeoStatus('address');
    if (!s.city || !s.stateUF) return;
    try {
      let cityList = cities;
      if (s.stateUF && s.stateUF !== (dadosClient.municipio?.uf || dadosClient.state)) {
        cityList = await enderecoService.getMunicipiosByUF(s.stateUF);
        setCities(cityList);
      }
      const normalize = (v: string) => v.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
      const match = cityList.find(c => normalize(c.nome) === normalize(s.city));
      if (match) {
        setDadosClient(prev => ({
          ...prev,
          address: s.addressText || s.displayName, latitude: s.lat, longitude: s.lon,
          municipio_id: match.id, city_name: match.nome, municipio: match,
          state: match.uf, cep: s.postcode.replace('-', '') || prev.cep,
        }));
      }
    } catch { /* city/state auto-fill failed silently */ }
  };

  const formatCPF = (value: string) =>
    value.replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');

  const formatPhone = (value: string) =>
    value.replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');

  const selectModalItem = (item: Estado | Municipio) => {
    if (modalType === 'estado') {
      const estado = item as Estado;
      setDadosClient(prev => ({ ...prev, state: estado.uf, municipio_id: undefined, municipio: undefined }));
      enderecoService.getMunicipiosByUF(estado.uf)
        .then(setCities)
        .catch(() => toast.show('Não foi possível carregar as cidades.', { type: 'error' }));
    } else if (modalType === 'cidade') {
      const cidade = item as Municipio;
      setDadosClient(prev => ({ ...prev, municipio_id: cidade.id, city_name: cidade.nome, municipio: cidade }));
      scheduleGeocode(dadosClient.address || '', cidade.nome, cidade.uf);
    }
    setModalVisible(false); setSearchTerm('');
  };

  const onGravar = async () => {
    const { name, email, phone, address, municipio_id } = dadosClient;
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !address?.trim() || !municipio_id) {
      toast.show('Todos os campos são obrigatórios.', { type: 'error' }); return;
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
    } catch { toast.show('Erro ao gravar Cliente!', { type: 'error' }); }
  };

  return (
    <View className="screen px-6">
      <FormScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: 20, paddingBottom: 40 }}>
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
                onChangeText={(text) => setDadosClient(prev => ({ ...prev, phone: text.replace(/\D/g, '') }))}
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
                  if (step !== 'edit')
                    setDadosClient(prev => ({ ...prev, cpf: text.replace(/\D/g, '') }));
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
                    toast.show('Selecione um estado primeiro!', { type: 'warning' }); return;
                  }
                  setModalType('cidade'); setSearchTerm(''); setModalVisible(true);
                }}
              />
            </View>
          </View>

          <AddressInput
            value={dadosClient.address || ''}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            suggestionsLoading={suggestionsLoading}
            onChangeText={handleAddressChange}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onClear={() => { handleAddressChange(''); setShowSuggestions(false); setSuggestions([]); }}
            onSelectSuggestion={handleSelectSuggestion}
            onCloseSuggestions={() => { setShowSuggestions(false); setSuggestions([]); }}
          />

          <GeoBadge
            status={geoStatus}
            lat={dadosClient.latitude}
            lon={dadosClient.longitude}
          />
        </View>

        <View className="mt-6 mb-5">
          <Button
            title={step === 'edit' ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            variant="primary-dark"
            onPress={onGravar}
            icon={<Feather name="check" size={20} color={colors.light.main} />}
          />
          <View className="h-3" />
          <Button title="Cancelar" variant="secondary" onPress={onCancelCadastrar} />
        </View>
      </FormScrollView>

      <LocationModal
        visible={modalVisible}
        type={modalType}
        estados={estados}
        cities={cities}
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        onSelect={selectModalItem}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}
