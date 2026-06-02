import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Button, useToast, useConfirm } from '@/components';
import DetailsProduct from './DetailsProduct';
import CadastroProduct from './CadastroProduct';

import { productsService, Product } from '@/services/products.service';
import { useNavigation } from '@react-navigation/native';

type Step = 'filter' | 'register' | 'details' | 'edit';

export function Products() {
  const navigation = useNavigation();
  const toast = useToast();
  const confirm = useConfirm();
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
    if (step === 'filter') loadData();
  }, [step]);

  const cancelCadastrar = () => {
    setProductSelected(null);
    setStep('filter');
  };

  const cadastrarItem = (item?: any) => {
    setProductSelected(item);
    setStep('details');
  };

  const handleUnarchive = async (id: string) => {
    try {
      await productsService.unarchive(id);
      toast.show('Produto desarquivado!', { type: 'success' });
      loadData();
    } catch (error) {
      console.error('Erro ao desarquivar:', error);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productSelected) return;

    try {
      const hasSales = await productsService.hasSales(productSelected.id);

      if (hasSales) {
        const ok = await confirm({
          title: 'Arquivar Produto',
          message: 'Este produto possui vendas vinculadas e não pode ser excluído. Deseja arquivá-lo?',
          confirmText: 'Arquivar',
        });
        if (!ok) return;
        try {
          await productsService.archive(productSelected.id);
          toast.show('Produto arquivado com sucesso!', { type: 'success' });
          setStep('filter');
        } catch {
          toast.show('Não foi possível arquivar o produto.', { type: 'error' });
        }
      } else {
        const ok = await confirm({
          title: 'Excluir Produto',
          message: `Tem certeza que deseja excluir o produto ${productSelected.name}?`,
          confirmText: 'Excluir',
          destructive: true,
        });
        if (!ok) return;
        try {
          await productsService.delete(productSelected.id);
          toast.show('Produto excluído com sucesso!', { type: 'success' });
          setStep('filter');
        } catch {
          toast.show('Não foi possível excluir o produto.', { type: 'error' });
        }
      }
    } catch {
      toast.show('Não foi possível verificar as vendas do produto.', { type: 'error' });
    }
  };

  const PageHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <View className="page-header">
      <TouchableOpacity onPress={onBack} className="mr-3 p-1">
        <Feather name="chevron-left" size={28} color="#3C096C" />
      </TouchableOpacity>
      <Text className="page-title">{title}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      className="screen"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {step === 'filter' && (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <PageHeader title="Produtos" onBack={() => navigation.goBack()} />

          <Button
            title="Novo Produto"
            variant="secondary"
            className="mx-5 mb-5"
            onPress={() => { setProductSelected(null); setStep('register'); }}
            icon={<Feather name="plus" size={20} color="#EAE3F0" />}
          />

          <View className="px-5 mb-3">
            <Text className="section-title">Ativos ({productsList.length})</Text>
          </View>

          {productsList.map((item) => (
            <TouchableOpacity
              key={item.id}
              className="entity-card mx-5 mb-3 elevation-2"
              onPress={() => { setProductSelected(item); setStep('details'); }}
            >
              <View className="flex-1">
                <Text className="text-base font-bold text-primary-dark mb-1">{item.name}</Text>
                <Text className="text-[13px] text-primary-light" numberOfLines={1}>
                  {item.description || 'Sem descrição'}
                </Text>
              </View>
              <View className="items-end mx-3">
                <Text className="text-base font-bold text-primary">
                  R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#8B5A96" />
            </TouchableOpacity>
          ))}

          {archivedList.length > 0 && (
            <>
              <View className="px-5 mt-6 mb-3">
                <Text className="section-title text-primary-light">Arquivados ({archivedList.length})</Text>
              </View>
              {archivedList.map((item) => (
                <View
                  key={item.id}
                  className="entity-card mx-5 mb-3 opacity-60"
                >
                  <View className="flex-1">
                    <Text className="text-base font-bold text-primary-dark mb-1">{item.name}</Text>
                    <Text className="text-[13px] text-primary-light">Arquivado</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleUnarchive(item.id)}
                    className="unarchive-btn"
                  >
                    <Feather name="refresh-cw" size={20} color="#758C36" />
                    <Text className="text-[10px] text-secondary-dark font-bold mt-0.5">Restaurar</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
          <View className="h-10" />
        </ScrollView>
      )}

      {step === 'details' && (
        <View className="flex-1">
          <PageHeader title="Detalhes" onBack={() => setStep('filter')} />
          <DetailsProduct
            product={(productSelected || {}) as any}
            onCancelEditar={cancelCadastrar}
            onEditarProduto={() => setStep('edit')}
            onDeletarProduto={handleDeleteProduct}
          />
        </View>
      )}

      {(step === 'edit' || step === 'register') && (
        <View className="flex-1">
          <PageHeader
            title={step === 'edit' ? 'Editar Produto' : 'Novo Produto'}
            onBack={() => setStep('filter')}
          />
          <CadastroProduct
            product={(productSelected || {}) as any}
            step={step}
            onCancelCadastrar={cancelCadastrar}
            onCadastrar={(item) => cadastrarItem(item)}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
