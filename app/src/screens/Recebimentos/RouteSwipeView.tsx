import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, useToast } from '@/components';
import { recebimentosService } from '@/services/recebimentos.service';
import { RouteStop, SwipeCardHandle } from './types';
import { renderPrice, isInstallment, openDrivingNav } from './helpers';
import { SwipeCard } from './SwipeCard';
import { CompletionView } from './CompletionView';
import { InstallmentModal } from './InstallmentModal';
import { colors } from '@/theme/color';

interface RouteSwipeViewProps {
  initialRoute: RouteStop[];
  onBack:       () => void;
}

export function RouteSwipeView({ initialRoute, onBack }: RouteSwipeViewProps) {
  const toast = useToast();
  const [remaining, setRemaining] = useState(initialRoute);
  const [skipped,   setSkipped]   = useState<RouteStop[]>([]);
  const [received,  setReceived]  = useState(0);
  const [collected, setCollected] = useState(0);

  const [showConfirm,      setShowConfirm]      = useState(false);
  const [amountStr,        setAmountStr]        = useState('');
  const [saving,           setSaving]           = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installSaving,    setInstallSaving]    = useState(false);

  const cardRef  = useRef<SwipeCardHandle>(null);
  const current  = remaining[0];
  const nextStop = remaining[1];

  const handleRequestReceive = () => {
    if (!current) return;
    if (isInstallment(current.sale)) {
      setShowInstallModal(true);
    } else {
      setAmountStr(current.total.toFixed(2).replace('.', ','));
      setShowConfirm(true);
    }
  };

  const handleConfirmReceive = async () => {
    if (!current) return;
    const num = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(num) || num <= 0) { toast.show('Valor inválido.', { type: 'error' }); return; }
    setSaving(true);
    try {
      await recebimentosService.markReceived(current.sale.id, num);
      setShowConfirm(false);
      await cardRef.current?.animateOut('right');
      setRemaining(p => p.slice(1));
      setReceived(r => r + 1);
      setCollected(c => c + num);
    } catch (e: any) {
      setShowConfirm(false);
      await cardRef.current?.animateOut('right');
      setRemaining(p => p.slice(1));
      setReceived(r => r + 1);
      setCollected(c => c + num);
      toast.show(e.message, { type: 'info' });
    } finally { setSaving(false); }
  };

  const handleConfirmInstallments = async (ids: string[]) => {
    if (!current) return;
    setInstallSaving(true);
    const receivedAmt = (current.sale.sale_installments ?? [])
      .filter(i => ids.includes(i.id))
      .reduce((a, i) => a + i.amount, 0);
    try {
      await recebimentosService.markInstallmentsReceived(ids);
      setShowInstallModal(false);
      await cardRef.current?.animateOut('right');
      setRemaining(p => p.slice(1));
      setReceived(r => r + 1);
      setCollected(c => c + receivedAmt);
    } catch (e: any) {
      setShowInstallModal(false);
      await cardRef.current?.animateOut('right');
      setRemaining(p => p.slice(1));
      setReceived(r => r + 1);
      setCollected(c => c + receivedAmt);
      toast.show(e.message, { type: 'info' });
    } finally { setInstallSaving(false); }
  };

  const handleSkip       = () => { setSkipped(p => [...p, remaining[0]]); setRemaining(p => p.slice(1)); };
  const handlePularPress = () => { cardRef.current?.animateOut('left').then(handleSkip); };
  const handleNavigate   = () => {
    if (!current) return;
    openDrivingNav(current.sale.clients?.address ?? '', current.city);
  };

  if (remaining.length === 0) {
    return <CompletionView received={received} totalCollected={collected} skipped={skipped} onBack={onBack} />;
  }

  const total    = initialRoute.length;
  const progress = received / total;

  return (
    <View className="screen pb-[100px]">
      {/* Progress header */}
      <View className="bg-white border-b border-light-dark">
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={onBack} className="p-1">
            <Feather name="arrow-left" size={20} color={colors.primary.dark} />
          </TouchableOpacity>
          <View className="flex-1 mx-3">
            <Text className="text-[11px] text-primary font-semibold mb-1.5">
              {received} de {total} recebimentos · {renderPrice(collected)}
            </Text>
            <View className="h-1 bg-light-dark rounded-sm">
              <View
                className="h-1 bg-secondary-dark rounded-sm"
                style={{ width: `${progress * 100}%` as any }}
              />
            </View>
          </View>
          <Text className="text-[11px] font-bold text-primary-dark">{remaining.length} rest.</Text>
        </View>
      </View>

      {/* Card stack */}
      <View className="flex-1 mx-4 my-3 relative">
        {nextStop && (
          <View
            className="items-center justify-center opacity-75 bg-light rounded-[20px] elevation-2"
            style={{ position: 'absolute', top: 12, left: 14, right: 14, bottom: -12, zIndex: 0 }}
          >
            <Text className="text-base font-bold text-primary-dark">{nextStop.sale.clients?.name}</Text>
            <Text className="text-xs text-primary mt-0.5">{nextStop.city}</Text>
            <Text className="text-sm font-bold text-secondary-dark mt-1">{renderPrice(nextStop.total)}</Text>
          </View>
        )}
        <SwipeCard
          key={current.sale.id}
          ref={cardRef}
          stop={current}
          onRequestReceive={handleRequestReceive}
          onSwipeLeft={handleSkip}
        />
      </View>

      {/* Action buttons */}
      <View className="bg-white border-t border-light-dark pb-1">
        <View className="flex-row justify-between items-center px-8 pt-3 pb-1">
          <TouchableOpacity
            className="items-center justify-center w-[68px] h-[68px] rounded-full bg-danger-light border-2 border-danger gap-0.5"
            onPress={handlePularPress}
          >
            <Feather name="x" size={26} color={colors.danger.main} />
            <Text className="text-[10px] font-bold text-danger text-center">Pular</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: colors.primary.dark, gap: 2,
            }}
            onPress={handleNavigate}
          >
            <Feather name="navigation" size={20} color={colors.secondary.light} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.secondary.light }}>Navegar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center justify-center w-[68px] h-[68px] rounded-full bg-secondary-dark gap-0.5"
            onPress={handleRequestReceive}
          >
            <Feather name="check" size={26} color="white" />
            <Text className="text-[10px] font-bold text-white text-center">Recebido</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-[10px] text-primary-light text-center pb-1">
          ← pular · navegar · recebido →
        </Text>
      </View>

      {/* À vista confirm modal */}
      <Modal visible={showConfirm} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <TouchableOpacity
            className="modal-overlay-bottom"
            activeOpacity={1}
            onPress={() => !saving && setShowConfirm(false)}
          >
            <TouchableOpacity activeOpacity={1} className="modal-sheet-bottom">
              <Text className="text-lg font-bold text-primary-dark text-center mb-1">Confirmar Recebimento</Text>
              <Text className="text-sm text-primary text-center mb-4">{current?.sale.clients?.name}</Text>
              <Text className="label-upper mt-2">Valor Recebido (R$)</Text>
              <TextInput
                className="amount-input"
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="decimal-pad"
                selectTextOnFocus
                autoFocus
              />
              <View className="flex-row">
                <Button title="Cancelar" variant="primary-dark" className="flex-1 mr-1.5" onPress={() => setShowConfirm(false)} disabled={saving} />
                <Button title={saving ? 'Salvando...' : 'Confirmar'} variant="secondary" className="flex-[1.5]" onPress={handleConfirmReceive} disabled={saving} />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <InstallmentModal
        sale={showInstallModal && current ? current.sale : null}
        onClose={() => setShowInstallModal(false)}
        onConfirm={handleConfirmInstallments}
        saving={installSaving}
      />
    </View>
  );
}
