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
        if (dadosProduct.price && step === 'edit') {
            setDadosProduct(prevState => ({
                ...prevState,
                price: parseFloat(dadosProduct.price ? dadosProduct.price.toString() : '').toFixed(2) as any
            }));
        }
    }, []);

    const onGravar = () => {
        const { name, price, stock } = dadosProduct;

        if (!name?.trim() || !String(price ?? '').trim() || !String(stock ?? '').trim()) {
            return alert('Erro: Preencha todos os campos obrigatórios!');
        }

        const payload = {
            ...dadosProduct,
            price: parseFloat(String(price).replace(',', '.'))
        };

        if (step === 'edit') {
            alert('Produto alterado com sucesso! ✅');
            productsService.updated(payload as any);
        } else if (step === 'register') {
            alert('Produto cadastrado com sucesso! ✅');
            productsService.create(payload as any);
        }
        onCadastrar(payload);
    };

    return (
        <View style={styles.container}>
            <View style={styles.formCard}>
                <Input
                    label="Nome do Produto"
                    value={dadosProduct.name}
                    placeholder="Ex: Camiseta Branca M"
                    onChangeText={(text) => {
                        setDadosProduct(prevState => ({ ...prevState, name: text }));
                    }}
                />
                
                <View style={styles.row}>
                    <View style={styles.flexItem}>
                        <Input
                            label="Preço (R$)"
                            value={dadosProduct.price ? dadosProduct.price?.toString() : ''}
                            keyboardType="numeric"
                            placeholder="0,00"
                            onChangeText={(text) => {
                                const valorCorrigido = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                                setDadosProduct(PrevState => ({ ...PrevState, price: valorCorrigido as any }))
                            }}
                        />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={styles.flexItem}>
                        <Input
                            label="Estoque Inicial"
                            value={dadosProduct.stock ? dadosProduct.stock?.toString() : ''}
                            keyboardType="numeric"
                            placeholder="0"
                            onChangeText={(text) => {
                                const valorCorrigido = text.replace(/[^0-9]/g, '');
                                setDadosProduct(PrevState => ({ ...PrevState, stock: valorCorrigido as any }))
                            }}
                        />
                    </View>
                </View>

                <Input
                    label="Descrição (Opcional)"
                    value={dadosProduct.description}
                    multiline
                    numberOfLines={3}
                    placeholder="Detalhes sobre o produto..."
                    onChangeText={(text) => {
                        setDadosProduct(prevState => ({ ...prevState, description: text }));
                    }}
                />
            </View>

            <View style={styles.actionButtons}>
                <Button 
                    title={step === 'edit' ? 'Salvar Alterações' : 'Cadastrar Produto'} 
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: colors.light.main, 
        paddingHorizontal: 24,
        paddingTop: 20,
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
        marginTop: 'auto',
        marginBottom: 40,
    },
});
