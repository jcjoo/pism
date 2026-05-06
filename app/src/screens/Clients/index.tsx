import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, FlatList, Alert, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components';
import DetailsClient from './DetailsClient';
import CadastroClient from './CadastroClient';
import { colors } from '@/theme';

// Services
import { clientsService, Client } from '@/services/clients.service';
import { useNavigation } from '@react-navigation/native';

type Step = 'filter' | 'register' | 'details' | 'edit';

export function Clients() {
    const navigation = useNavigation()
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
        if (step === 'filter') {
            loadData();
        }
    }, [step]);

    const cancelCadastrar = () => {
        setClientSelected(null)
        setStep('filter')
    }

    const EditarProduto = () => {
        setStep('edit')
    }

    const cadastrarItem = (item?: any) => {
        setClientSelected(item)
        setStep('details')
    }

    const handleUnarchive = async (id: string) => {
        try {
            await clientsService.unarchive(id);
            Alert.alert("Sucesso", "Cliente desarquivado!");
            loadData();
        } catch (error) {
            console.error("Erro ao desarquivar:", error);
        }
    };

    const handleDeleteClient = async () => {
        if (!clientSelected) return;

        try {
            const hasSales = await clientsService.hasSales(clientSelected.id);
            
            if (hasSales) {
                Alert.alert(
                    "Arquivar Cliente",
                    "Este cliente possui vendas vinculadas e não pode ser excluído. Deseja arquivá-lo? Ele não aparecerá mais em novas vendas.",
                    [
                        { text: "Cancelar", style: "cancel" },
                        {
                            text: "Arquivar",
                            onPress: async () => {
                                try {
                                    await clientsService.archive(clientSelected.id);
                                    Alert.alert("Sucesso", "Cliente arquivado com sucesso!");
                                    setStep('filter');
                                } catch (error) {
                                    console.error("Erro ao arquivar cliente:", error);
                                    Alert.alert("Erro", "Não foi possível arquivar the cliente.");
                                }
                            }
                        }
                    ]
                );
            } else {
                Alert.alert(
                    "Excluir Cliente",
                    `Tem certeza que deseja excluir o cliente ${clientSelected.name}?`,
                    [
                        { text: "Cancelar", style: "cancel" },
                        {
                            text: "Excluir",
                            style: "destructive",
                            onPress: async () => {
                                try {
                                    await clientsService.delete(clientSelected.id);
                                    Alert.alert("Sucesso", "Cliente excluído com sucesso!");
                                    setStep('filter');
                                } catch (error) {
                                    console.error("Erro ao excluir cliente:", error);
                                    Alert.alert("Erro", "Não foi possível excluir o cliente.");
                                }
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error("Erro ao verificar vendas do cliente:", error);
            Alert.alert("Erro", "Não foi possível verificar as vendas do cliente.");
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {step === 'filter' && (
                <ScrollView style={styles.flexItem} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Feather name="chevron-left" size={28} color={colors.primary.dark} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Clientes</Text>
                        </View>
                    </View>

                    <Button
                        title="Novo Cliente"
                        variant="secondary"
                        style={styles.buttonCadastar}
                        onPress={() => { setClientSelected(null); setStep('register'); }}
                        icon={<Feather name="user-plus" size={20} color={colors.light.main} />}
                    />

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Ativos ({clientList.length})</Text>
                    </View>

                    {clientList.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.clientCard, { marginHorizontal: 20 }]}
                            onPress={() => { setClientSelected(item); setStep('details'); }}
                        >
                            <View style={styles.clientIcon}>
                                <Feather name="user" size={24} color={colors.primary.main} />
                            </View>
                            <View style={styles.clientInfo}>
                                <Text style={styles.clientName}>{item.name}</Text>
                                <Text style={styles.clientDetails}>
                                    {item.cpf ? `CPF: ${item.cpf}` : 'Sem CPF'} • {(item as any).municipio?.nome || 'Sem Cidade'}
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={20} color={colors.primary.light} />
                        </TouchableOpacity>
                    ))}

                    {archivedList.length > 0 && (
                        <>
                            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                                <Text style={[styles.sectionTitle, { color: colors.primary.light }]}>Arquivados ({archivedList.length})</Text>
                            </View>
                            {archivedList.map((item) => (
                                <View key={item.id} style={[styles.clientCard, { marginHorizontal: 20, opacity: 0.6 }]}>
                                    <View style={styles.clientIcon}>
                                        <Feather name="archive" size={24} color={colors.primary.light} />
                                    </View>
                                    <View style={styles.clientInfo}>
                                        <Text style={styles.clientName}>{item.name}</Text>
                                        <Text style={styles.clientDetails}>Arquivado</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleUnarchive(item.id)} style={styles.unarchiveButton}>
                                        <Feather name="refresh-cw" size={20} color={colors.secondary.dark} />
                                        <Text style={styles.unarchiveText}>Restaurar</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </>
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            {step === 'details' && (
                <View style={styles.flexItem}>
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity onPress={() => setStep('filter')} style={styles.backButton}>
                                <Feather name="chevron-left" size={28} color={colors.primary.dark} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Detalhes</Text>
                        </View>
                    </View>
                    <DetailsClient 
                        client={(clientSelected || {}) as any} 
                        onCancelEditar={() => cancelCadastrar()} 
                        onEditarProduto={() => { EditarProduto(); }} 
                        onDeletarCliente={() => handleDeleteClient()}
                    />
                </View>
            )}

            {(step === 'edit' || step === 'register') && (
                <View style={styles.flexItem}>
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity onPress={() => setStep('filter')} style={styles.backButton}>
                                <Feather name="chevron-left" size={28} color={colors.primary.dark} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>
                                {step === 'edit' ? 'Editar Cliente' : 'Novo Cliente'}
                            </Text>
                        </View>
                    </View>
                    <CadastroClient client={(clientSelected || {}) as any} step={step} onCancelCadastrar={() => cancelCadastrar()} onCadastrar={(item) => cadastrarItem(item)} />
                </View>
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.light.main },
    flexItem: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: colors.light.main,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary.dark
    },
    buttonCadastar: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary.dark,
    },
    clientCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.light.main,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.light.dark,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    clientIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F0F4FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    clientInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.primary.dark,
        marginBottom: 4,
    },
    clientDetails: {
        fontSize: 13,
        color: colors.primary.light,
    },
    unarchiveButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 12,
        borderLeftWidth: 1,
        borderLeftColor: colors.light.dark,
    },
    unarchiveText: {
        fontSize: 10,
        color: colors.secondary.dark,
        fontWeight: 'bold',
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: colors.primary.light,
    },
});