import { Feather } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { Button } from "@/components";
import { Tables } from "@/types/database.types";

type ClientData = Partial<Tables<'clients'>>;

interface newClientProps {
  client: ClientData;
  onCancelEditar: () => void;
  onEditarProduto: () => void;
  onDeletarCliente: () => void;
}

const formatCPF = (value: string) =>
  value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');

const formatPhone = (value: string) =>
  value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');

export default function DetailsClient({ client, onCancelEditar, onEditarProduto, onDeletarCliente }: newClientProps) {
  return (
    <View className="screen-padded">
      <View className="details-card elevation-4">
        <View className="icon-avatar-lg">
          <Feather name="user" size={40} color="#5A189A" />
        </View>
        <Text className="page-title text-center mb-4">{client?.name}</Text>

        <View className="info-row">
          <Feather name="mail" size={16} color="#8B5A96" />
          <Text className="text-sm font-semibold text-primary ml-2">{client?.email || 'Sem e-mail'}</Text>
        </View>

        <View className="info-row">
          <Feather name="phone" size={16} color="#8B5A96" />
          <Text className="text-sm text-primary-light ml-2">
            {client.phone ? formatPhone(client.phone) : 'Sem telefone'}
          </Text>
        </View>

        <View className="info-row">
          <Feather name="file-text" size={16} color="#8B5A96" />
          <Text className="text-sm text-primary-light ml-2">
            {client?.cpf ? formatCPF(client.cpf) : 'Sem CPF'}
          </Text>
        </View>

        <View className="detail-block">
          <Text className="label-upper">Endereço</Text>
          <Text className="text-sm text-primary-dark leading-5">
            {client?.address}, {(client as any).municipio?.nome} - {(client as any).municipio?.estado?.uf || (client as any).municipio?.uf}
          </Text>
        </View>
      </View>

      <View className="action-buttons">
        <Button
          title="Editar Cliente"
          variant="primary-dark"
          onPress={onEditarProduto}
          icon={<Feather name="edit-2" size={18} color="#EAE3F0" />}
        />
        <View className="h-3" />
        <Button
          title="Excluir / Arquivar"
          variant="danger"
          onPress={onDeletarCliente}
          icon={<Feather name="trash-2" size={18} color="#EAE3F0" />}
        />
        <View className="h-3" />
        <Button title="Voltar para Lista" variant="secondary" onPress={onCancelEditar} />
      </View>
    </View>
  );
}
