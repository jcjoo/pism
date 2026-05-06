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
    onDeletarProduto: () => void
}

export default function DetailsProduct({ product, onCancelEditar, onEditarProduto, onDeletarProduto }: newProductProps) {
    return (
        <View style={styles.container}>
            <View style={styles.detailsCard}>
                <View style={styles.iconContainer}>
                    <Feather name="package" size={40} color={colors.primary.main} />
                </View>
                <Text style={styles.detailsName}>{product?.name}</Text>
                <Text style={styles.detailsPrice}>
                    R$ {product?.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>

                <View style={styles.infoRow}>
                    <Feather name="info" size={16} color={colors.primary.light} />
                    <Text style={styles.detailsDescription}>{product?.description || 'Sem descrição'}</Text>
                </View>

                <View style={styles.stockInfo}>
                    <Text style={styles.stockLabel}>Estoque Atual</Text>
                    <Text style={[
                        styles.stockValue,
                        { color: (product?.stock || 0) > 0 ? '#2E7D32' : '#C62828' }
                    ]}>
                        {product?.stock || 0} unidades
                    </Text>
                </View>
            </View>

            <View style={styles.actionButtons}>
                <Button
                    title="Editar Produto"
                    variant="primary-dark"
                    onPress={() => onEditarProduto()}
                    icon={<Feather name="edit-2" size={18} color={colors.light.main} />}
                />
                <View style={{ height: 12 }} />
                <Button
                    title="Excluir / Arquivar"
                    variant="primary"
                    onPress={() => onDeletarProduto()}
                    style={{ backgroundColor: colors.danger.main }}
                    icon={<Feather name="trash-2" size={18} color={colors.light.main} />}
                />
                <View style={{ height: 12 }} />
                <Button
                    title="Voltar para Lista"
                    variant="secondary"
                    onPress={() => onCancelEditar()}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: colors.light.main, 
        paddingHorizontal: 24, 
        paddingTop: 20 
    },
    detailsCard: { 
        backgroundColor: colors.light.main, 
        borderRadius: 20, 
        padding: 24, 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.light.dark,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F0F4FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    detailsName: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        color: colors.primary.dark, 
        textAlign: 'center',
        marginBottom: 8,
    },
    detailsPrice: { 
        fontSize: 28, 
        fontWeight: '900', 
        color: colors.primary.main, 
        marginBottom: 24 
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        width: '100%',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: colors.light.dark,
    },
    detailsDescription: { 
        fontSize: 14, 
        color: colors.primary.light, 
        marginLeft: 8,
        flex: 1,
    },
    stockInfo: {
        width: '100%',
        marginTop: 16,
        padding: 16,
        backgroundColor: colors.light.dark,
        borderRadius: 12,
        alignItems: 'center',
    },
    stockLabel: {
        fontSize: 12,
        color: colors.primary.light,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    stockValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    actionButtons: {
        marginTop: 'auto',
        marginBottom: 40,
    },
});
