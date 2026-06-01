import { Feather } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { Button } from "@/components";

interface newProductProps {
  product: {
    created_at?: string;
    description?: string;
    id?: string;
    name?: string;
    price?: number;
    stock?: number;
    user_id?: string;
  };
  onCancelEditar: () => void;
  onEditarProduto: () => void;
  onDeletarProduto: () => void;
}

export default function DetailsProduct({ product, onCancelEditar, onEditarProduto, onDeletarProduto }: newProductProps) {
  const stockColor = (product?.stock || 0) > 0 ? '#2E7D32' : '#C62828';

  return (
    <View className="screen-padded">
      <View className="details-card elevation-4">
        <View className="icon-avatar-lg">
          <Feather name="package" size={40} color="#5A189A" />
        </View>
        <Text className="page-title text-center mb-2">{product?.name}</Text>
        <Text className="text-[28px] font-black text-primary mb-6">
          R$ {product?.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>

        <View className="info-row items-start">
          <Feather name="info" size={16} color="#8B5A96" />
          <Text className="text-sm text-primary-light ml-2 flex-1">
            {product?.description || 'Sem descrição'}
          </Text>
        </View>

        <View className="detail-block items-center">
          <Text className="label-upper">Estoque Atual</Text>
          <Text className="text-lg font-bold" style={{ color: stockColor }}>
            {product?.stock || 0} unidades
          </Text>
        </View>
      </View>

      <View className="action-buttons">
        <Button
          title="Editar Produto"
          variant="primary-dark"
          onPress={onEditarProduto}
          icon={<Feather name="edit-2" size={18} color="#EAE3F0" />}
        />
        <View className="h-3" />
        <Button
          title="Excluir / Arquivar"
          variant="danger"
          onPress={onDeletarProduto}
          icon={<Feather name="trash-2" size={18} color="#EAE3F0" />}
        />
        <View className="h-3" />
        <Button title="Voltar para Lista" variant="secondary" onPress={onCancelEditar} />
      </View>
    </View>
  );
}
