import { Feather } from "@expo/vector-icons";
import { View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Modal, Text, FlatList } from "react-native";
import { colors, typography } from "@/theme";
import { Button, Input, Select } from "@/components";
import { useState, useEffect } from "react";
import { clientsService } from "@/services/clients.service";
import { enderecoService, Estado, Municipio } from "@/services/endereco.service";
import { Tables } from "@/types/database.types";

type ClientData = Partial<Tables<'clients'>>;

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
            } catch (error) {
                console.error("Erro ao buscar estados:", error);
                alert("Não foi possível carregar os estados.");
            }
        };
        fetchStates();
    }, []);

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
                state: estado.uf, // Salva a sigla do estado, ex: 'SP'
                city: '' // Limpa a cidade ao trocar o estado
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
            setDadosClient(prevState => ({ ...prevState, city: cidade.nome }));
        }
        setModalVisible(false);
        setSearchTerm('');
    };

    const onGravar = async () => {
        const { name, email, phone, cpf, address, state, city } = dadosClient;

        if (!name?.trim() || !email?.trim() || !phone?.trim() || !cpf?.trim() || !address?.trim() || !state?.trim() || !city?.trim()) {
            return alert('Erro: Todos os campos são obrigatórios.');
        }

        try {
            if (step === 'edit') {
                await clientsService.updated(dadosClient as any);
                alert('Cliente alterado com sucesso! ✅');
                onCadastrar(dadosClient);
            } else if (step === 'register') {
                const newClientData = await clientsService.create(dadosClient as any);
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
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <TouchableOpacity onPress={() => onCancelCadastrar()}>
                    <Feather name="arrow-left" size={24} color="black" />
                </TouchableOpacity>
                <View style={styles.detailsCard}>
                    <Input
                        value={dadosClient.name}
                        placeholder="Nome completo"
                        onChangeText={(text) => {
                            setDadosClient(prevState => ({ ...prevState, name: text }));
                        }}
                    />
                    <Input style={styles.inputFlex}
                        value={dadosClient.email as any}
                        keyboardType='email-address'
                        placeholder="Email" onChangeText={(text) => {
                            setDadosClient(PrevState => ({ ...PrevState, email: text as any }))
                        }} />
                    <View style={styles.containerValores}>
                        {/* Input de Telefone */}
                        <Input style={[styles.inputFlex, styles.smallFontInput]}
                            value={formatPhone(dadosClient.phone?.toString() || '')}
                            keyboardType="numeric"
                            placeholder="Telefone"
                            onChangeText={(text) => {
                                const cleanText = text.replace(/\D/g, '');
                                setDadosClient(prevState => ({ ...prevState, phone: cleanText }));
                            }}
                        />
                        <Input style={[styles.inputFlex, styles.smallFontInput]}
                            value={formatCPF(dadosClient.cpf?.toString() || '')}
                            keyboardType="numeric"
                            placeholder="CPF"
                            editable={step !== 'edit'}
                            onChangeText={(text) => {
                                if (step !== 'edit') {
                                    const cleanText = text.replace(/\D/g, '');
                                    setDadosClient(prevState => ({ ...prevState, cpf: cleanText }));
                                }
                            }}
                        />
                    </View>
                    <View style={styles.containerValores}>
                        <Select
                            style={styles.inputFlex}
                            label="Estado"
                            placeholder="Selecione o Estado"
                            value={dadosClient.state || ''}
                            onPress={() => {
                                setModalType('estado');
                                setModalVisible(true);
                            }}
                        />
                        <Select
                            style={styles.inputFlex}
                            label="Cidade"
                            placeholder="Selecione a Cidade"
                            value={dadosClient.city || ''}
                            onPress={() => {
                                if (!dadosClient.state) {
                                    return alert('Selecione um estado primeiro!');
                                }
                                setModalType('cidade');
                                setSearchTerm('');
                                setModalVisible(true);
                            }}
                        />
                    </View>
                    <Input
                        value={dadosClient.address}
                        multiline
                        placeholder="Endereço..."
                        onChangeText={(text) => {
                            setDadosClient(prevState => ({ ...prevState, address: text }));
                        }}
                    />
                </View>
                <View style={[styles.row, { marginTop: 16 }]}>
                    <Button title="Voltar" variant="primary" style={styles.flexItem} onPress={() => onCancelCadastrar()} />
                    <View style={{ width: 8 }} />
                    <Button title={step === 'edit' ? 'Gravar' : "Cadastrar"} variant="secondary" style={styles.flexItem} onPress={() => onGravar()} />
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
    containerValores: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        width: '100%',
    },
    inputFlex: {
        flex: 1,
        backgroundColor: colors.light.main
    },
    smallFontInput: {
        fontSize: 14.5,
    },
    container: { flex: 1, backgroundColor: colors.light.main, paddingTop: 24, marginHorizontal: 24 },
    backButton: { marginHorizontal: 24, marginBottom: 16 },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center'
    },
    scrollContentInner: { paddingHorizontal: 24, paddingBottom: 100 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
    row: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
    flexItem: { flex: 1 },
    listContainer: { backgroundColor: colors.light.dark, borderRadius: 8, padding: 16, marginTop: 16 },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    listTitle: { color: colors.primary.dark, fontWeight: 'bold', fontSize: 16 },
    listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.light.main },
    listIdx: { color: colors.primary.main, width: 20 },
    listName: { color: colors.primary.dark, flex: 1, marginRight: 8 },
    listDate: { color: colors.primary.main, fontSize: 12, marginRight: 8 },
    listPrice: { color: colors.primary.main, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', color: colors.primary.main, marginTop: 24 },
    detailsCard: { backgroundColor: colors.light.dark, borderRadius: 8, padding: 24, alignItems: 'stretch', marginTop: 16 },
    detailsClient: { fontSize: 20, fontWeight: typography.weights.bold as any, color: colors.primary.dark, textAlign: 'center' },
    detailsAddress: { fontSize: 12, color: colors.primary.dark, textAlign: 'center', marginVertical: 24 },
    detailsTotal: { fontSize: 24, fontWeight: typography.weights.black as any, color: colors.primary.dark, marginBottom: 24, marginTop: 24 },
    detailsItem: { color: colors.primary.main, fontSize: 14, marginBottom: 4 },
    detailsDates: { color: colors.primary.main, fontSize: 12, marginTop: 24 },
    cartContainer: { marginTop: 16, padding: 16, backgroundColor: colors.light.dark, borderRadius: 8 },
    editCartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cartItemText: { fontSize: 14, color: colors.primary.dark, fontWeight: 'bold' },
    cartItemRemove: { fontSize: 12, color: colors.primary.main, textDecorationLine: 'underline' },
    cartTotalText: { fontSize: 16, color: colors.primary.dark, fontWeight: 'bold', marginTop: 12, marginBottom: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: colors.light.main, borderRadius: 8, padding: 24, maxHeight: '80%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary.dark, marginBottom: 16, textAlign: 'center' },
    modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.light.dark },
    modalItemText: { fontSize: 16, color: colors.primary.main },
    modalEmpty: { textAlign: 'center', color: colors.primary.main, marginVertical: 16 }
});
