import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, FlatList, Alert, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components';
import DetailsProduct from './DetailsProduct';
import CadastroProduct from './CadastroProduct';
import { colors } from '@/theme';

// Services
import { productsService, Product } from '@/services/products.service';
import { useNavigation } from '@react-navigation/native';

type Step = 'filter' | 'register' | 'details' | 'edit';

export function Products() {
    const navigation = useNavigation()
    const [productsList, setProductsList] = useState<Product[]>([]);
    const [archivedList, setArchivedList] = useState<Product[]>([]);
    const [productSelected, setProductSelected] = useState<Product | null>(null);
    const [step, setStep] = useState<Step>('filter');

    const loadData = async () => {
        try {
            const active = await productsService.getAll(false);
            setProductsList(active);
            const archived = await productsService.getAll(true);
            setArchivedList(archived.filter((p: any) => p.is_archived));
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
        setProductSelected(null)
        setStep('filter')
    }

    const EditarProduct = () => {
        setStep('edit')
    }

    const cadastrarItem = (item?: any) => {
        setProductSelected(item)
        setStep('details')
    }

    const handleUnarchive = async (id: string) => {
        try {
            await productsService.unarchive(id);
            Alert.alert("Sucesso", "Produto desarquivado!");
            loadData();
        } catch (error) {
            console.error("Erro ao desarquivar:", error);
        }
    };

    const handleDeleteProduct = async () => {
        if (!productSelected) return;

        try {
            const hasSales = await productsService.hasSales(productSelected.id);

            if (hasSales) {
                Alert.alert(
                    "Arquivar Produto",
                    "Este produto possui vendas vinculadas e não pode ser excluído. Deseja arquivá-lo? Ele não aparecerá mais em novas vendas.",
                    [
                        { text: "Cancelar", style: "cancel" },
                        {
                            text: "Arquivar",
                            onPress: async () => {
                                try {
                                    await productsService.archive(productSelected.id);
                                    Alert.alert("Sucesso", "Produto arquivado com sucesso!");
                                    setStep('filter');
                                } catch (error) {
                                    console.error("Erro ao arquivar produto:", error);
                                    Alert.alert("Erro", "Não foi possível arquivar o produto.");
                                }
                            }
                        }
                    ]
                );
            } else {
                Alert.alert(
                    "Excluir Produto",
                    `Tem certeza que deseja excluir o produto ${productSelected.name}?`,
                    [
                        { text: "Cancelar", style: "cancel" },
                        {
                            text: "Excluir",
                            style: "destructive",
                            onPress: async () => {
                                try {
                                    await productsService.delete(productSelected.id);
                                    Alert.alert("Sucesso", "Produto excluído com sucesso!");
                                    setStep('filter');
                                } catch (error) {
                                    console.error("Erro ao excluir produto:", error);
                                    Alert.alert("Erro", "Não foi possível excluir o produto.");
                                }
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error("Erro ao verificar vendas do produto:", error);
            Alert.alert("Erro", "Não foi possível verificar as vendas do produto.");
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
                            <Text style={styles.headerTitle}>Produtos</Text>
                        </View>
                    </View>

                    <Button 
                        title="Novo Produto" 
                        variant="secondary" 
                        style={styles.buttonCadastar} 
                        onPress={() => { setProductSelected(null); setStep('register'); }} 
                        icon={<Feather name="plus" size={20} color={colors.light.main} />}
                    />

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Ativos ({productsList.length})</Text>
                    </View>

                    {productsList.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.productCard, { marginHorizontal: 20 }]}
                            onPress={() => { setProductSelected(item); setStep('details'); }}
                        >
                            <View style={styles.productInfo}>
                                <Text style={styles.productName}>{item.name}</Text>
                                <Text style={styles.productDescription} numberOfLines={1}>
                                    {item.description || 'Sem descrição'}
                                </Text>
                            </View>
                            <View style={styles.productStats}>
                                <Text style={styles.productPrice}>
                                    R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                <View key={item.id} style={[styles.productCard, { marginHorizontal: 20, opacity: 0.6 }]}>
                                    <View style={styles.productInfo}>
                                        <Text style={styles.productName}>{item.name}</Text>
                                        <Text style={styles.productDescription}>Arquivado</Text>
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
                    <DetailsProduct 
                        product={(productSelected || {}) as any} 
                        onCancelEditar={() => cancelCadastrar()} 
                        onEditarProduto={() => EditarProduct()} 
                        onDeletarProduto={() => handleDeleteProduct()} 
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
                                {step === 'edit' ? 'Editar Produto' : 'Novo Produto'}
                            </Text>
                        </View>
                    </View>
                    <CadastroProduct product={(productSelected || {}) as any} step={step} onCancelCadastrar={() => cancelCadastrar()} onCadastrar={(item) => cadastrarItem(item)} />
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
    productCard: {
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
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.primary.dark,
        marginBottom: 4,
    },
    productDescription: {
        fontSize: 13,
        color: colors.primary.light,
    },
    productStats: {
        alignItems: 'flex-end',
        marginHorizontal: 12,
    },
    productPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.primary.main,
        marginBottom: 4,
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