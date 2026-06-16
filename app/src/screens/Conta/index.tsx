import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input, FormScrollView, useToast } from '@/components';
import { colors } from '@/theme/color';

export function Conta() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const toast = useToast();

  const meta = (user as any)?.user_metadata ?? {};
  const initialName = meta.full_name ?? meta.name ?? '';
  const email = user?.email ?? '';

  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const initials = (n: string) =>
    n.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

  const handleSaveName = async () => {
    if (!name.trim()) { toast.show('Nome não pode estar vazio.', { type: 'error' }); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
      if (error) throw error;
      toast.show('Nome atualizado com sucesso!', { type: 'success' });
    } catch (e: any) {
      toast.show(e.message, { type: 'error' });
    } finally { setSaving(false); }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      toast.show('A senha precisa ter ao menos 6 caracteres.', { type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.show('As senhas não coincidem.', { type: 'error' });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.show('Senha alterada com sucesso!', { type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (e: any) {
      toast.show(e.message, { type: 'error' });
    } finally { setSavingPassword(false); }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const displayInitials = initials(name) || email.slice(0, 2).toUpperCase();

  return (
    <View className="screen">
      <FormScrollView contentContainerStyle={{ paddingBottom: 48 }}>

        <View className="page-header">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1">
            <Feather name="chevron-left" size={28} color={colors.primary.dark} />
          </TouchableOpacity>
          <Text className="page-title">Minha Conta</Text>
        </View>

        <View className="items-center py-8">
          <View style={{
            width: 88, height: 88, borderRadius: 44,
            backgroundColor: colors.primary.dark, alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: 'white' }}>
              {displayInitials}
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.primary.light }}>{email}</Text>
        </View>

        <View className="px-5">
          {/* Dados pessoais */}
          <View className="form-card elevation-2 mb-4">
            <Text className="section-title mb-4">Dados Pessoais</Text>

            <Input
              label="Nome"
              value={name}
              placeholder="Seu nome completo"
              onChangeText={setName}
            />

            <Input
              label="E-mail"
              value={email}
              editable={false}
              style={{ opacity: 0.5 }}
            />

            <Button
              title={saving ? 'Salvando...' : 'Salvar Alterações'}
              variant="primary-dark"
              onPress={handleSaveName}
              disabled={saving}
              icon={saving ? undefined : <Feather name="check" size={18} color={colors.light.main} />}
            />
          </View>

          {/* Segurança */}
          <View className="form-card elevation-2 mb-4">
            <TouchableOpacity
              onPress={() => setShowPasswordForm(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Feather name="lock" size={18} color={colors.primary.main} />
              <Text style={{ marginLeft: 12, flex: 1, fontSize: 15, color: colors.primary.dark, fontWeight: '600' }}>
                Alterar senha
              </Text>
              <Feather
                name={showPasswordForm ? 'chevron-up' : 'chevron-down'}
                size={18} color={colors.primary.light}
              />
            </TouchableOpacity>

            {showPasswordForm && (
              <View style={{ marginTop: 16 }}>
                <Input
                  label="Nova senha"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="Mínimo 6 caracteres"
                />
                <Input
                  label="Confirmar nova senha"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder="Repita a nova senha"
                />
                <Button
                  title={savingPassword ? 'Salvando...' : 'Salvar senha'}
                  variant="primary-dark"
                  onPress={handleSavePassword}
                  disabled={savingPassword}
                  icon={savingPassword ? undefined : <Feather name="check" size={18} color={colors.light.main} />}
                />
              </View>
            )}
          </View>

          {/* Sair */}
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              paddingVertical: 14, borderRadius: 12,
              backgroundColor: colors.danger.light, borderWidth: 1, borderColor: '#FFCDD2',
              gap: 8,
            }}
          >
            <Feather name="log-out" size={18} color={colors.danger.main} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.danger.main }}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </FormScrollView>
    </View>
  );
}
