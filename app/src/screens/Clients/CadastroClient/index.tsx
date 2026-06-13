import { Feather } from "@expo/vector-icons";
import {
  View, TouchableOpacity, Modal, Text, FlatList, ActivityIndicator, TextInput,
} from "react-native";
import { Button, Input, Select, FormScrollView, useToast } from "@/components";
import { useState, useEffect, useRef, useCallback } from "react";
import { clientsService } from "@/services/clients.service";
import { enderecoService, Estado, Municipio } from "@/services/endereco.service";
import { geocodingService, GeoCoord, AddressSuggestion } from "@/services/geocoding.service";
import { Tables } from "@/types/database.types";

type ClientData = Partial<Tables<'clients'>> & {
  state?: string;
  city_name?: string;
  municipio?: any;
};

type GeoStatus = 'idle' | 'loading' | 'address' | 'city' | 'none';

interface ClientProps {
  client: ClientData;
  step: string;
  onCancelCadastrar: () => void;
  onCadastrar: (item: ClientData) => void;
}

export default function CadastroClient({ client, step, onCancelCadastrar, onCadastrar }: ClientProps) {
  const toast = useToast();
  const [dadosClient, setDadosClient]       = useState<ClientData>(client || {});
  const [modalVisible, setModalVisible]     = useState(false);
  const [modalType, setModalType]           = useState<'estado' | 'cidade' | null>(null);
  const [estados, setEstados]               = useState<Estado[]>([]);
  const [cities, setCities]                 = useState<Municipio[]>([]);
  const [searchTerm, setSearchTerm]         = useState('');

  // Geo badge
  const [geoStatus, setGeoStatus] = useState<GeoStatus>(() =>
    client?.latitude != null && client?.longitude != null ? 'address' : 'idle'
  );

  // Address autocomplete
  const [suggestions, setSuggestions]       = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geoSeqRef    = useRef(0);
  const sugSeqRef    = useRef(0);

  // ── Load states on mount ──────────────────────────────────────────────────
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

  // ── Geocode for the badge ─────────────────────────────────────────────────
  const runGeocode = useCallback(async (address: string, city: string, uf: string) => {
    const seq = ++geoSeqRef.current;
    setGeoStatus('loading');

    const addressResult = address.trim().length >= 5
      ? await geocodingService.byAddress(address, city, uf)
      : null;

    if (seq !== geoSeqRef.current) return;

    if (addressResult) {
      setDadosClient(prev => ({ ...prev, latitude: addressResult.lat, longitude: addressResult.lon }));
      setGeoStatus('address');
      return;
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

  // ── Address suggestions ───────────────────────────────────────────────────
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddressChange = (text: string) => {
    setDadosClient(prev => ({ ...prev, address: text }));
    const city = dadosClient.municipio?.nome || dadosClient.city_name || '';
    const uf   = dadosClient.municipio?.uf   || dadosClient.state     || '';

    // Suggestions dropdown
    scheduleSuggestions(text, city, uf);

    // Geo badge fallback when field is cleared
    if (!text.trim() && city && uf) {
      ++geoSeqRef.current;
      runGeocode('', city, uf);
    }
  };

  const handleSelectSuggestion = async (s: AddressSuggestion) => {
    setShowSuggestions(false);
    setSuggestions([]);
    ++sugSeqRef.current;
    ++geoSeqRef.current;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Fill address text and coordinates immediately
    setDadosClient(prev => ({
      ...prev,
      address:   s.addressText || s.displayName,
      latitude:  s.lat,
      longitude: s.lon,
    }));
    setGeoStatus('address');

    // Auto-fill city/state if we can match to the municipio table
    if (!s.city || !s.stateUF) return;

    try {
      // Ensure cities for that UF are loaded
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
          address:      s.addressText || s.displayName,
          latitude:     s.lat,
          longitude:    s.lon,
          municipio_id: match.id,
          city_name:    match.nome,
          municipio:    match,
          state:        match.uf,
          cep:          s.postcode.replace('-', '') || prev.cep,
        }));
      }
    } catch {
      // city/state auto-fill failed silently — address + coords already set
    }
  };

  const formatCPF = (value: string) =>
    value.replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');

  const formatPhone = (value: string) =>
    value.replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');

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
    } catch {
      toast.show('Erro ao gravar Cliente!', { type: 'error' });
    }
  };

  const filteredCities = cities.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Geo badge config ──────────────────────────────────────────────────────
  const GEO_CFG = {
    loading: { icon: null,       color: '#5A189A', bg: '#F0EBF8', label: 'Buscando coordenadas...' },
    address: { icon: 'map-pin',  color: '#1B8A3D', bg: '#E6F7EC', label: 'Endereço localizado' },
    city:    { icon: 'map-pin',  color: '#FF8C00', bg: '#FFF4E5', label: 'Coordenada da cidade (aproximada)' },
    none:    { icon: 'x-circle', color: '#9E9E9E', bg: '#F5F5F5', label: 'Coordenada não encontrada' },
    idle:    { icon: null,       color: '',        bg: '',        label: '' },
  } as const;

  const geo = GEO_CFG[geoStatus];
  const lat = dadosClient.latitude;
  const lon = dadosClient.longitude;

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
                onChangeText={(text) => {
                  setDadosClient(prev => ({ ...prev, phone: text.replace(/\D/g, '') }));
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
                    toast.show('Selecione um estado primeiro!', { type: 'warning' });
                    return;
                  }
                  setModalType('cidade');
                  setSearchTerm('');
                  setModalVisible(true);
                }}
              />
            </View>
          </View>

          {/* ── Address with autocomplete ── */}
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#3C096C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
              Endereço
            </Text>
            <View
              style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: '#F0EBF8', borderRadius: 10,
                paddingHorizontal: 12, minHeight: 44,
              }}
            >
              <TextInput
                style={{ flex: 1, fontSize: 14, color: '#1A0030', paddingVertical: 10 }}
                placeholder="Rua, número, bairro..."
                placeholderTextColor="#8B5A96"
                value={dadosClient.address || ''}
                onChangeText={handleAddressChange}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                multiline={false}
              />
              {suggestionsLoading && (
                <ActivityIndicator size="small" color="#5A189A" style={{ marginLeft: 6 }} />
              )}
              {!suggestionsLoading && (dadosClient.address?.length ?? 0) > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    handleAddressChange('');
                    setShowSuggestions(false);
                    setSuggestions([]);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={15} color="#8B5A96" />
                </TouchableOpacity>
              )}
            </View>

            {/* Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <View
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 10,
                  marginTop: 4,
                  borderWidth: 1,
                  borderColor: '#E1DAE8',
                  elevation: 6,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  overflow: 'hidden',
                }}
              >
                {suggestions.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleSelectSuggestion(s)}
                    style={{
                      flexDirection: 'row', alignItems: 'flex-start',
                      paddingHorizontal: 14, paddingVertical: 11,
                      borderBottomWidth: i < suggestions.length - 1 ? 1 : 0,
                      borderBottomColor: '#F0EBF8',
                      gap: 10,
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="map-pin" size={14} color="#5A189A" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, color: '#1A0030', fontWeight: '500' }} numberOfLines={1}>
                        {s.addressText || s.displayName.split(',')[0]}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#8B5A96', marginTop: 1 }} numberOfLines={1}>
                        {[s.city, s.stateUF].filter(Boolean).join(' · ')}
                        {s.postcode ? ` · ${s.postcode}` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => { setShowSuggestions(false); setSuggestions([]); }}
                  style={{ alignItems: 'center', paddingVertical: 8, backgroundColor: '#FAF8FC' }}
                >
                  <Text style={{ fontSize: 11, color: '#8B5A96' }}>Fechar sugestões</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Geo badge */}
          {geoStatus !== 'idle' && (
            <View
              style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: geo.bg,
                borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
                marginTop: 6, gap: 7,
              }}
            >
              {geoStatus === 'loading' ? (
                <ActivityIndicator size="small" color="#5A189A" />
              ) : (
                <Feather name={geo.icon as any} size={13} color={geo.color} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: geo.color }}>
                  {geo.label}
                </Text>
                {(geoStatus === 'address' || geoStatus === 'city') && lat != null && lon != null && (
                  <Text style={{ fontSize: 10, color: '#666', marginTop: 1 }}>
                    {lat.toFixed(5)}, {lon.toFixed(5)}
                  </Text>
                )}
              </View>
            </View>
          )}
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
      </FormScrollView>

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
    </View>
  );
}
