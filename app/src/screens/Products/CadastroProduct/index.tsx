import { Feather } from "@expo/vector-icons";
import { View } from "react-native";
import { Button, Input, FormScrollView, useToast } from "@/components";
import { useState, useEffect } from "react";
import { productsService } from "@/services/products.service";

interface ProductProps {
  product: {
    created_at?: string;
    description?: string;
    id?: string;
    name?: string;
    price?: number;
    stock?: number;
    user_id?: string;
  };
  step: string;
  onCancelCadastrar: () => void;
  onCadastrar: (item: dadosProductProps) => void;
}

interface dadosProductProps {
  created_at?: string;
  description?: string;
  id?: string;
  name?: string;
  price?: number;
  stock?: number;
  user_id?: string;
}

export default function CadastroProduct({ product, step, onCancelCadastrar, onCadastrar }: ProductProps) {
  const toast = useToast();
  const [dadosProduct, setDadosProduct] = useState<dadosProductProps>(product || {});

  useEffect(() => {
    if (dadosProduct.price && step === 'edit') {
      setDadosProduct(prev => ({
        ...prev,
        price: parseFloat(dadosProduct.price ? dadosProduct.price.toString() : '').toFixed(2) as any,
      }));
    }
  }, []);

  const onGravar = () => {
    const { name, price, stock } = dadosProduct;
    if (!name?.trim() || !String(price ?? '').trim() || !String(stock ?? '').trim()) {
      toast.show('Preencha todos os campos obrigatórios!', { type: 'error' });
      return;
    }
    const payload = { ...dadosProduct, price: parseFloat(String(price).replace(',', '.')) };
    if (step === 'edit') {
      toast.show('Produto alterado com sucesso!', { type: 'success' });
      productsService.updated(payload as any);
    } else if (step === 'register') {
      toast.show('Produto cadastrado com sucesso!', { type: 'success' });
      productsService.create(payload as any);
    }
    onCadastrar(payload);
  };

  return (
    <FormScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <View className="form-card elevation-2">
        <Input
          label="Nome do Produto"
          value={dadosProduct.name}
          placeholder="Ex: Camiseta Branca M"
          onChangeText={(text) => setDadosProduct(prev => ({ ...prev, name: text }))}
        />

        <View className="flex-row items-center">
          <View className="flex-1">
            <Input
              label="Preço (R$)"
              value={dadosProduct.price ? dadosProduct.price.toString() : ''}
              keyboardType="numeric"
              placeholder="0,00"
              onChangeText={(text) => {
                const valorCorrigido = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                setDadosProduct(prev => ({ ...prev, price: valorCorrigido as any }));
              }}
            />
          </View>
          <View className="w-3" />
          <View className="flex-1">
            <Input
              label="Estoque Inicial"
              value={dadosProduct.stock ? dadosProduct.stock.toString() : ''}
              keyboardType="numeric"
              placeholder="0"
              onChangeText={(text) => {
                const valorCorrigido = text.replace(/[^0-9]/g, '');
                setDadosProduct(prev => ({ ...prev, stock: valorCorrigido as any }));
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
          onChangeText={(text) => setDadosProduct(prev => ({ ...prev, description: text }))}
        />
      </View>

      <View className="action-buttons">
        <Button
          title={step === 'edit' ? 'Salvar Alterações' : 'Cadastrar Produto'}
          variant="primary-dark"
          onPress={onGravar}
          icon={<Feather name="check" size={20} color="#EAE3F0" />}
        />
        <View className="h-3" />
        <Button title="Cancelar" variant="secondary" onPress={onCancelCadastrar} />
      </View>
    </FormScrollView>
  );
}
