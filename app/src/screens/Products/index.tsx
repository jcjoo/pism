import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Input, Button, QuantitySelector, Select } from '@/components';
import DetailsProduct from './DetailsProduct';
import CadastroProduct from './CadastroProduct';
import { colors, typography } from '@/theme';

// Services
import { productsService, Product } from '@/services/products.service';
import { useNavigation } from '@react-navigation/native';

type Step = 'filter' | 'register' | 'details' | 'edit';

export function Products() {
    const navigation = useNavigation()
    // Data for Selectors
    const [productsList, setProductsList] = useState<Product[]>([]);
    //Variaveis para exibir o Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'cliente' | 'product'>('cliente');
    //Mudar-Inserir Produto
    const [productSelected, setProductSelected] = useState<Product | null>(null);
    const [step, setStep] = useState<Step>('filter');

    useEffect(() => {
        if (step === 'filter') {
            const loadData = async () => {
                try {
                    const pData = await productsService.getAll();
                    setProductsList(pData);
                } catch (error) {
                    console.error('Error loading data:', error);
                }
            };
            loadData();
        }
    }, [step]);

    const selectModalItem = (item: Product) => {
        if (item.id !== 'none') {
            setProductSelected(item);
            setModalVisible(false);
            console.log(item)
            setStep('details')
        }
        else {
            setModalVisible(false);
        }
    }
    const cancelCadastrar = () => {
        setProductSelected(null)
        setStep('filter')
    }
    const EditarProduto = () => {
        setStep('edit')
    }
    const cadastrarItem = (item?: any) => {
        setProductSelected(item)
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
                        <Text style={styles.headerTitle}>Produtos</Text>
                        <TouchableOpacity>
                            <Feather name="menu" size={28} color={colors.primary.dark} />
                        </TouchableOpacity>
                    </View>

                    <Button title="Adicionar Produto" variant="secondary" style={styles.buttonCadastar} onPress={() => { setStep('register') }} />
                    {/* //Botoes que realizam as reações */}
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <Select
                            label="Mercadoria"
                            value={''}
                            placeholder="Todas as Mercadorias"
                            onPress={() => { setModalType('product'); setModalVisible(true); }}
                        />
                    </ScrollView>
                </View>
            )}
            {/* exibe a tela de Edição/Criação de produto */}
            {(step === 'details') && (
                <View style={styles.flexItem}>
                    <DetailsProduct product={(productSelected || {}) as any} onCancelEditar={() => cancelCadastrar()} onEditarProduto={() => EditarProduto()} />
                </View>
            )}
            {(step === 'edit' || step === 'register') && (
                <View style={styles.flexItem}>
                    <CadastroProduct product={(productSelected || {}) as any} step={step} onCancelCadastrar={() => cancelCadastrar()} onCadastrar={(item) => cadastrarItem(item)} />
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
                            data={[{ id: 'none', name: 'Todas as Mercadorias' } as any, ...productsList]
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