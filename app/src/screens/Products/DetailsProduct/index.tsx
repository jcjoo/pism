import { Feather } from "@expo/vector-icons";
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { colors, typography } from "@/theme";
import { Button } from "@/components";
import { useEffect } from "react";

interface newProductProps {
    product: {
        created_at?: string,
        description?: string,
        id?: string,
        name?: string,
        price?: number,
        stock?: number,
        user_id?: string
    },
    onCancelEditar: () => void
    onEditarProduto: () => void
}

export default function DetailsProduct({ product, onCancelEditar, onEditarProduto }: newProductProps) {
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

            <TouchableOpacity onPress={() => onCancelEditar()}>
                <Feather name="arrow-left" size={24} color="black" />
            </TouchableOpacity>
            <View style={styles.detailsCard}>
                <Text style={styles.detailsClient}>{product?.name}</Text>

                <Text style={styles.detailsTotal}>R$ {product?.price}</Text>

                <Text style={styles.detailsDates}>Descrição: {product?.description}</Text>
                <Text style={styles.detailsAddress}>{product?.stock} em estoque</Text>
            </View>

            <View style={[styles.row, { marginTop: 16 }]}>
                <Button title="Voltar" variant="primary" style={styles.flexItem} onPress={() => onCancelEditar()} />
                <View style={{ width: 8 }} />
                <Button title="Editar" variant="primary-dark" style={styles.flexItem} onPress={() => onEditarProduto()} />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.light.main, marginHorizontal: 24 },
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
    detailsCard: { backgroundColor: colors.light.dark, borderRadius: 8, padding: 24, alignItems: 'center', marginTop: 16},
    detailsClient: { fontSize: 20, fontWeight: typography.weights.bold as any, color: colors.primary.dark, textAlign: 'center'},
    detailsAddress: { fontSize: 15, color: colors.primary.dark, textAlign: 'center', marginVertical: 24, fontWeight: 700 },
    detailsTotal: { fontSize: 24, fontWeight: typography.weights.black as any, color: colors.primary.dark, marginBottom: 24, marginTop: 24},
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
