import { Feather } from "@expo/vector-icons";
import { View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Modal, Text, FlatList } from "react-native";
import { colors, typography } from "@/theme";
import { Button, Input, Select } from "@/components";
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
    client: ClientData,
    step: string,
    onCancelCadastrar: () => void
    onCadastrar: (item: ClientData) => void
}

export default function CadastroClient({ client, step, onCancelCadastrar, onCadastrar }: ClientProps) {
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
                
                // If editing, fetch cities for the current state
                const currentState = client?.municipio?.uf || client?.state;
                if (currentState) {
                    const citiesData = await enderecoService.getMunicipiosByUF(currentState);
                    setCities(citiesData);
                }
            } catch (error) {
                console.error("Erro ao buscar estados:", error);
                alert("Não foi possível carregar os estados.");
            }
        };
        fetchStates();
    }, [client]);

    const formatCPF = (value: string) => {
        return value
            .replace(/\D/g, '') // Remove tudo que não é dígito
            .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto após os 3 primeiros dígitos
            .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto após os 6 primeiros dígitos
            .replace(/(\d{3})(\d{1,2})/, '$1-$2') // Coloca hífen antes dos últimos 2 dígitos
            .replace(/(-\d{2})\d+?$/, '$1'); // Limita o tamanho
    };

    const formatPhone = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    };

    const selectModalItem = (item: Estado | Municipio) => {
        if (modalType === 'estado') {
            const estado = item as Estado;
            setDadosClient(prevState => ({
                ...prevState,
                state: estado.uf,
                municipio_id: undefined,
                municipio: undefined
            }));
            // Busca as cidades para o estado selecionado
            const fetchCities = async () => {
                try {
                    const data = await enderecoService.getMunicipiosByUF(estado.uf);
                    setCities(data);
                } catch (error) {
                    console.error("Erro ao buscar cidades:", error);
                    alert("Não foi possível carregar as cidades.");
                }
            };
            fetchCities();
        } else if (modalType === 'cidade') {
            const cidade = item as Municipio;
            setDadosClient(prevState => ({ 
                ...prevState, 
                municipio_id: cidade.id,
                city_name: cidade.nome,
                municipio: cidade
            }));
        }
        setModalVisible(false);
        setSearchTerm('');
    };

    const onGravar = async () => {
        const { name, email, phone, address, municipio_id } = dadosClient;

        if (!name?.trim() || !email?.trim() || !phone?.trim() || !address?.trim() || !municipio_id) {
            return alert('Erro: Todos os campos são obrigatórios.');
        }

        try {
            // Cleanup helper fields before saving
            const { city_name, state, municipio, ...payload } = dadosClient as any;
            
            if (step === 'edit') {
                await clientsService.updated(payload);
                alert('Cliente alterado com sucesso! ✅');
                onCadastrar(dadosClient);
            } else if (step === 'register') {
                const newClientData = await clientsService.create(payload);
                alert('Cliente cadastrado com sucesso! ✅');
                onCadastrar(newClientData);
            }
        } catch (error) {
            console.error("Erro ao gravar cliente:", error);
            alert('Erro ao gravar Cliente! ❎❌');
        }
    };

    const filteredCities = cities.filter(city =>
        city.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.formCard}>
                    <Input
                        label="Nome Completo"
                        value={dadosClient.name}
                        placeholder="Ex: João da Silva"
                        onChangeText={(text) => {
                            setDadosClient(prevState => ({ ...prevState, name: text }));
                        }}
                    />
                    
                    <Input
                        label="E-mail"
                        value={dadosClient.email || ''}
                        keyboardType='email-address'
                        placeholder="exemplo@email.com"
                        onChangeText={(text) => {
                            setDadosClient(PrevState => ({ ...PrevState, email: text }))
                        }}
                    />

                    <View style={styles.row}>
                        <View style={styles.flexItem}>
                            <Input
                                label="Telefone"
                                value={formatPhone(dadosClient.phone?.toString() || '')}
                                keyboardType="numeric"
                                placeholder="(00) 00000-0000"
                                onChangeText={(text) => {
                                    const cleanText = text.replace(/\D/g, '');
                                    setDadosClient(prevState => ({ ...prevState, phone: cleanText }));
                                }}
                            />
                        </View>
                        <View style={{ width: 12 }} />
                        <View style={styles.flexItem}>
                            <Input
                                label="CPF"
                                value={formatCPF(dadosClient.cpf?.toString() || '')}
                                keyboardType="numeric"
                                placeholder="000.000.000-00"
                                editable={step !== 'edit'}
                                onChangeText={(text) => {
                                    if (step !== 'edit') {
                                        const cleanText = text.replace(/\D/g, '');
                                        setDadosClient(prevState => ({ ...prevState, cpf: cleanText }));
                                    }
                                }}
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.flexItem}>
                            <Select
                                label="Estado"
                                placeholder="UF"
                                value={dadosClient.municipio?.uf || dadosClient.state || ''}
                                onPress={() => {
                                    setModalType('estado');
                                    setModalVisible(true);
                                }}
                            />
                        </View>
                        <View style={{ width: 12 }} />
                        <View style={[styles.flexItem, { flex: 2 }]}>
                            <Select
                                label="Cidade"
                                placeholder="Selecione"
                                value={dadosClient.municipio?.nome || dadosClient.city_name || ''}
                                onPress={() => {
                                    if (!dadosClient.state && !dadosClient.municipio?.uf) {
                                        return alert('Selecione um estado primeiro!');
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
                        onChangeText={(text) => {
                            setDadosClient(prevState => ({ ...prevState, address: text }));
                        }}
                    />
                </View>

                <View style={styles.actionButtons}>
                    <Button 
                        title={step === 'edit' ? 'Salvar Alterações' : 'Cadastrar Cliente'} 
                        variant="primary-dark" 
                        onPress={() => onGravar()} 
                        icon={<Feather name="check" size={20} color={colors.light.main} />}
                    />
                    <View style={{ height: 12 }} />
                    <Button 
                        title="Cancelar" 
                        variant="secondary" 
                        onPress={() => onCancelCadastrar()} 
                    />
                </View>
            </ScrollView>
            {/*Modal que traz as informações passadas*/}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Selecione {modalType === 'estado' ? 'o Estado' : 'a Cidade'}
                        </Text>
                        {modalType === 'cidade' && (
                            <Input
                                placeholder="Digite o nome da cidade..."
                                value={searchTerm}
                                onChangeText={setSearchTerm}
                                style={{ marginBottom: 16 }}
                            />
                        )}
                        <FlatList
                            data={(modalType === 'estado' ? estados : filteredCities) as any[]}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => selectModalItem(item)}
                                >
                                    <Text style={styles.modalItemText}>{item.nome}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.modalEmpty}>Nenhum item encontrado ou carregando...</Text>}
                        />
                        <Button title="Fechar" onPress={() => { setModalVisible(false); setSearchTerm(''); }} variant="primary" />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: colors.light.main, 
        paddingHorizontal: 24,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingTop: 20,
        paddingBottom: 40,
    },
    formCard: {
        backgroundColor: colors.light.main,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.light.dark,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    row: { 
        flexDirection: 'row', 
        alignItems: 'center',
    },
    flexItem: { 
        flex: 1 
    },
    actionButtons: {
        marginTop: 24,
        marginBottom: 20,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: colors.light.main, borderRadius: 8, padding: 24, maxHeight: '80%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary.dark, marginBottom: 16, textAlign: 'center' },
    modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.light.dark },
    modalItemText: { fontSize: 16, color: colors.primary.main },
    modalEmpty: { textAlign: 'center', color: colors.primary.main, marginVertical: 16 }
});
