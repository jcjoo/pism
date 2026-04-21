import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Input, Button, QuantitySelector, Select } from '@/components';
import DetailsClient from './DetailsClient';
import CadastroClient from './CadastroClient';
import { colors, typography } from '@/theme';

// Services
import { clientsService, Client } from '@/services/clients.service';
import { useNavigation } from '@react-navigation/native';

type Step = 'filter' | 'register' | 'details' | 'edit';

export function Clients() {
    const navigation = useNavigation()
    // Data for Selectors
    const [clientList, setClientsList] = useState<Client[]>([]);
    //Variaveis para exibir o Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'cliente' | 'product'>('cliente');
    //Mudar-Inserir Produto
    const [clientSelected, setClientSelected] = useState<Client | null>(null);
    const [step, setStep] = useState<Step>('filter');

    useEffect(() => {
        if (step === 'filter') {
            const loadData = async () => {
                try {
                    const pData = await clientsService.getAll();
                    setClientsList(pData);
                } catch (error) {
                    console.error('Error loading data:', error);
                }
            };
            loadData();
        }
    }, [step]);

    const selectModalItem = (item: Client) => {
        if (item.id !== 'none') {
            setClientSelected(item);
            setModalVisible(false);
            console.log(item)
            setStep('details')
        }
        else {
            setModalVisible(false);
        }
    }
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

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Feather name="arrow-left" size={24} color="black" />
            </TouchableOpacity>
            {step === 'filter' && (
                <View>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Clientes</Text>
                        <TouchableOpacity>
                            <Feather name="menu" size={28} color={colors.primary.dark} />
                        </TouchableOpacity>
                    </View>

                    <Button title="Adicionar Cliente" variant="secondary" style={styles.buttonCadastar} onPress={() => { setStep('register') }} />
                    {/* //Botoes que realizam as reações */}
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <Select
                            label="Clientes"
                            value={''}
                            placeholder="Todas os Clientes"
                            onPress={() => { setModalType('cliente'); setModalVisible(true); }}
                        />
                    </ScrollView>
                </View>
            )}
            {/* exibe a tela de Edição/Criação de produto */}
            {(step === 'details') && (
                <View style={styles.flexItem}>
                    <DetailsClient client={(clientSelected || {}) as any} onCancelEditar={() => cancelCadastrar()} onEditarProduto={() => { EditarProduto(); console.log(clientSelected); }} />
                </View>
            )}
            {(step === 'edit' || step === 'register') && (
                <View style={styles.flexItem}>
                    <CadastroClient client={(clientSelected || {}) as any} step={step} onCancelCadastrar={() => cancelCadastrar()} onCadastrar={(item) => cadastrarItem(item)} />
                </View>
            )}

            {/*Modal que traz as informações passadas*/}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Selecione o {modalType === 'cliente' ? 'Cliente' : 'Produto'}
                        </Text>
                        <FlatList
                            data={[...clientList]
                            }
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => selectModalItem(item)}
                                >
                                    <Text style={styles.modalItemText}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.modalEmpty}>Nenhum item encontrado.</Text>}
                        />
                        <Button title="Fechar" onPress={() => setModalVisible(false)} variant="primary" />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: colors.light.main, borderRadius: 8, padding: 24, maxHeight: '80%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary.dark, marginBottom: 16, textAlign: 'center' },
    modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.light.dark },
    modalItemText: { fontSize: 16, color: colors.primary.main },
    modalEmpty: { textAlign: 'center', color: colors.primary.main, marginVertical: 16 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 },
    headerTitle: { fontSize: parseInt(typography.sizes.h3, 10) || 28, fontWeight: 'bold', color: colors.primary.dark },
    container: { flex: 1, backgroundColor: colors.light.main },
    flexItem: { flex: 1 },
    buttonCadastar: {
        marginHorizontal: 24
    }
});