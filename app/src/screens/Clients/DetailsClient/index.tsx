import { Feather } from "@expo/vector-icons";
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { colors, typography } from "@/theme";
import { Button } from "@/components";
import { Tables } from "@/types/database.types";

type ClientData = Partial<Tables<'clients'>>;

interface newClientProps {
    client: ClientData,
    onCancelEditar: () => void
    onEditarProduto: () => void
    onDeletarCliente: () => void
}

const formatCPF = (value: string) => {
    return value
        .replace(/\D/g, '') // Remove tudo que não é dígito
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

const formatPhone = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
};

export default function DetailsClient({ client, onCancelEditar, onEditarProduto, onDeletarCliente }: newClientProps) {
    return (
        <View style={styles.container}>
            <View style={styles.detailsCard}>
                <View style={styles.iconContainer}>
                    <Feather name="user" size={40} color={colors.primary.main} />
                </View>
                <Text style={styles.detailsName}>{client?.name}</Text>

                <View style={styles.infoRow}>
                    <Feather name="mail" size={16} color={colors.primary.light} />
                    <Text style={styles.detailsEmail}>{client?.email || 'Sem e-mail'}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Feather name="phone" size={16} color={colors.primary.light} />
                    <Text style={styles.detailsText}>
                        {client.phone ? formatPhone(client.phone) : 'Sem telefone'}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Feather name="file-text" size={16} color={colors.primary.light} />
                    <Text style={styles.detailsText}>
                        {client?.cpf ? formatCPF(client.cpf) : 'Sem CPF'}
                    </Text>
                </View>

                <View style={styles.addressInfo}>
                    <Text style={styles.addressLabel}>Endereço</Text>
                    <Text style={styles.addressValue}>
                        {client?.address}, {(client as any).municipio?.nome} - {(client as any).municipio?.estado?.uf || (client as any).municipio?.uf}
                    </Text>
                </View>
            </View>

            <View style={styles.actionButtons}>
                <Button
                    title="Editar Cliente"
                    variant="primary-dark"
                    onPress={() => onEditarProduto()}
                    icon={<Feather name="edit-2" size={18} color={colors.light.main} />}
                />
                <View style={{ height: 12 }} />
                <Button
                    title="Excluir / Arquivar"
                    variant="primary"
                    onPress={() => onDeletarCliente()}
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
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: colors.light.dark,
    },
    detailsEmail: {
        fontSize: 14,
        color: colors.primary.main,
        marginLeft: 8,
        fontWeight: '600',
    },
    detailsText: {
        fontSize: 14,
        color: colors.primary.light,
        marginLeft: 8
    },
    addressInfo: {
        width: '100%',
        marginTop: 16,
        padding: 16,
        backgroundColor: colors.light.dark,
        borderRadius: 12,
    },
    addressLabel: {
        fontSize: 12,
        color: colors.primary.light,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    addressValue: {
        fontSize: 14,
        color: colors.primary.dark,
        lineHeight: 20,
    },
    actionButtons: {
        marginTop: 'auto',
        marginBottom: 40,
    },
});
