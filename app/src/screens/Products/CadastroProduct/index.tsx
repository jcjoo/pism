import { Feather } from "@expo/vector-icons";
import { View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { colors, typography } from "@/theme";
import { Button, Input } from "@/components";
import { useState, useEffect } from "react";
import { productsService } from "@/services/products.service";

interface ProductProps {
    product: {
        created_at?: string,
        description?: string,
        id?: string,
        name?: string,
        price?: number,
        stock?: number,
        user_id?: string
    },
    step: string,
    onCancelCadastrar: () => void
    onCadastrar: (item: dadosProductProps) => void
}
interface dadosProductProps {
    created_at?: string,
    description?: string,
    id?: string,
    name?: string,
    price?: number,
    stock?: number,
    user_id?: string
}

export default function CadastroProduct({ product, step, onCancelCadastrar, onCadastrar }: ProductProps) {
    const [dadosProduct, setDadosProduct] = useState<dadosProductProps>(product || {});

    useEffect(() => {
        if (dadosProduct.price) {
            setDadosProduct(prevState => ({
                ...prevState,
                price: parseFloat(dadosProduct.price ? dadosProduct.price.toString() : '').toFixed(2) as any
            }));
        }
    }, []);
    const onGravar = () => {
        const { name, price, stock } = dadosProduct;

        // Validação enxuta
        if (!name?.trim() || !String(price ?? '').trim() || !String(stock ?? '').trim()) {
            return alert('Erro: Cadastro incompleto!');
        }

        setDadosProduct(PrevState => ({ ...PrevState, price: dadosProduct.price?.toFixed(2) as any }))
        if (step === 'edit') {
            alert('Produto alterado com sucesso! ✅');
            productsService.updated(dadosProduct as any)
        } else if (step === 'register') {
            alert('Produto cadastrado com sucesso! ✅');
            productsService.create(dadosProduct as any)
        }
        onCadastrar(dadosProduct)
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

            <TouchableOpacity onPress={() => onCancelCadastrar()}>
                <Feather name="arrow-left" size={24} color="black" />
            </TouchableOpacity>
            <View style={styles.detailsCard}>
                <Input
                    value={dadosProduct.name}
                    placeholder="Nome do produto"
                    onChangeText={(text) => {
                        setDadosProduct(prevState => ({ ...prevState, name: text }));
                    }}
                />
                <View style={styles.containerValores}>
                    <Input style={styles.inputFlex}
                        value={dadosProduct.price ? dadosProduct.price?.toString() as any : ''}
                        keyboardType="numeric"
                        placeholder="Valor" onChangeText={(text) => {
                            const valorCorrigido = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                            setDadosProduct(PrevState => ({ ...PrevState, price: valorCorrigido as any }))
                        }} />
                    <Input style={styles.inputFlex}
                        value={dadosProduct.stock ? dadosProduct.stock?.toString() as any : ''}
                        keyboardType="numeric"
                        placeholder="Estoque" onChangeText={(text) => {
                            const valorCorrigido = text.replace(/[^0-9]/g, '');
                            setDadosProduct(PrevState => ({ ...PrevState, stock: valorCorrigido as any }))
                        }} />
                </View>
                <Input
                    value={dadosProduct.description}
                    multiline
                    placeholder="Descrição..."
                    onChangeText={(text) => {
                        setDadosProduct(prevState => ({ ...prevState, description: text }));
                    }}
                />
            </View>
            <View style={[styles.row, { marginTop: 16 }]}>
                <Button title="Voltar" variant="primary" style={styles.flexItem} onPress={() => onCancelCadastrar()} />
                <View style={{ width: 8 }} />
                <Button title={step === 'edit' ? 'Gravar' : "Cadastrar"} variant="secondary" style={styles.flexItem} onPress={() => onGravar()} />
            </View>
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
        flex: 1
    },
    container: { flex: 1, backgroundColor: colors.light.main, paddingTop: 24, marginHorizontal: 24, justifyContent: 'center', },
    backButton: { marginHorizontal: 24, marginBottom: 16 },
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
