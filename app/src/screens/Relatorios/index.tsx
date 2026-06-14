import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ProdutoMaisVendido } from './ProdutoMaisVendido';
import { ClienteMaisCompra } from './ClienteMaisCompra';
import { FaturamentoMensal } from './FaturamentoMensal';
import { VendasEmAberto } from './VendasEmAberto';

type ReportStep = 'index' | 'produtos' | 'clientes' | 'faturamento' | 'aberto';

const REPORTS: { step: ReportStep; icon: string; title: string; subtitle: string }[] = [
  { step: 'produtos',    icon: 'bar-chart-2',  title: 'Produto mais vendido',    subtitle: 'Ranking por quantidade e receita'  },
  { step: 'clientes',    icon: 'users',         title: 'Cliente que mais compra', subtitle: 'Ranking por valor total gasto'     },
  { step: 'faturamento', icon: 'trending-up',   title: 'Faturamento mensal',      subtitle: 'Receita dos últimos 6 meses'       },
  { step: 'aberto',      icon: 'alert-circle',  title: 'Vendas em aberto',        subtitle: 'Pendências, atrasos e a vencer'    },
];

export function Relatorios() {
  const navigation = useNavigation();
  const [step, setStep] = useState<ReportStep>('index');

  if (step === 'produtos')    return <ProdutoMaisVendido    onBack={() => setStep('index')} />;
  if (step === 'clientes')    return <ClienteMaisCompra     onBack={() => setStep('index')} />;
  if (step === 'faturamento') return <FaturamentoMensal     onBack={() => setStep('index')} />;
  if (step === 'aberto')      return <VendasEmAberto        onBack={() => setStep('index')} />;

  return (
    <KeyboardAvoidingView className="screen" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="page-header">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1">
            <Feather name="chevron-left" size={28} color="#3C096C" />
          </TouchableOpacity>
          <Text className="page-title">Relatórios</Text>
        </View>

        <View className="px-5 pt-4 pb-8">
          <Text className="section-title mb-4">Vendas</Text>
          {REPORTS.map(r => (
            <TouchableOpacity
              key={r.step}
              onPress={() => setStep(r.step)}
              style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: '#fff', borderRadius: 14, padding: 16,
                borderWidth: 1, borderColor: '#E1DAE8', marginBottom: 10,
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: '#EAE3F0', alignItems: 'center', justifyContent: 'center',
                marginRight: 14,
              }}>
                <Feather name={r.icon as any} size={22} color="#3C096C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#3C096C' }}>{r.title}</Text>
                <Text style={{ fontSize: 12, color: '#8B5A96', marginTop: 2 }}>{r.subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#8B5A96" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
