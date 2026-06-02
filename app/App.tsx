import "./global.css";
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, Modal, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Navigation } from '@/navigation';
import { ToastProvider, useToast } from '@/components/Toast';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import { Button, Input } from '@/components';
import { supabase } from '@/services/supabase';
import { Feather } from '@expo/vector-icons';

function parseHashParams(url: string): Record<string, string> {
  const hash = url.split('#')[1];
  if (!hash) return {};
  return Object.fromEntries(
    hash.split('&').map(p => {
      const [k, v] = p.split('=');
      return [decodeURIComponent(k ?? ''), decodeURIComponent(v ?? '')];
    })
  );
}

function ResetPasswordModal({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (password.length < 6) {
      toast.show('Mínimo 6 caracteres.', { type: 'error' });
      return;
    }
    if (password !== confirm) {
      toast.show('As senhas não coincidem.', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.show('Senha alterada com sucesso!', { type: 'success' });
      setPassword('');
      setConfirm('');
      onDone();
    } catch (e: any) {
      toast.show(e.message, { type: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#F8F5FC' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>

          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: '#EAE3F0', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Feather name="lock" size={32} color="#3C096C" />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#3C096C', marginBottom: 6 }}>
              Nova senha
            </Text>
            <Text style={{ fontSize: 14, color: '#8B5A96', textAlign: 'center' }}>
              Escolha uma senha segura para sua conta.
            </Text>
          </View>

          <View style={{
            backgroundColor: '#fff', borderRadius: 20, padding: 24,
            borderWidth: 1, borderColor: '#E1DAE8',
          }}>
            <Input
              label="Nova senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Mínimo 6 caracteres"
            />
            <Input
              label="Confirmar senha"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="Repita a nova senha"
            />
            <Button
              title={saving ? 'Salvando...' : 'Salvar nova senha'}
              variant="secondary"
              onPress={handleSave}
              disabled={saving}
              icon={saving ? undefined : <Feather name="check" size={18} color="#0E0F0C" />}
            />
          </View>

          <TouchableOpacity
            onPress={onDone}
            style={{ alignItems: 'center', marginTop: 20 }}
          >
            <Text style={{ color: '#8B5A96', fontSize: 14 }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function App() {
  const [showReset, setShowReset] = useState(false);

  const handleUrl = async (url: string | null) => {
    if (!url) return;
    const params = parseHashParams(url);
    if (params.type === 'recovery' && params.access_token) {
      await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token ?? '',
      });
      setShowReset(true);
    }
  };

  useEffect(() => {
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <ConfirmProvider>
        <ToastProvider>
          <View className="flex-1 bg-light">
            <Navigation />
            <StatusBar style="auto" />
          </View>
          <ResetPasswordModal visible={showReset} onDone={() => setShowReset(false)} />
        </ToastProvider>
      </ConfirmProvider>
    </SafeAreaProvider>
  );
}
