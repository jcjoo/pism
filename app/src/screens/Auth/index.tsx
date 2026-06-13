import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Input, Button, FormScrollView, useToast } from '../../components';
import { supabase } from '../../services/supabase';

const REDIRECT_URL = 'salespro://reset-password';

export function Auth() {
  const toast = useToast();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleAuth() {
    if (!email || !password) {
      toast.show('Por favor, preencha email e senha.', { type: 'error' });
      return;
    }
    setLoading(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.show(error.message, { type: 'error' });
    } else {
      if (password !== confirmPassword) {
        toast.show('As senhas não coincidem.', { type: 'error' });
        setLoading(false);
        return;
      }
      if (!name) {
        toast.show('Por favor, preencha seu nome.', { type: 'error' });
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) toast.show(error.message, { type: 'error' });
      else {
        toast.show('Confira seu email para verificar sua conta!', { type: 'success' });
        setMode('login');
      }
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!email) {
      toast.show('Digite seu email para continuar.', { type: 'error' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: REDIRECT_URL,
    });
    setLoading(false);
    if (error) {
      toast.show(error.message, { type: 'error' });
    } else {
      toast.show('Link enviado! Verifique seu email.', { type: 'success' });
      setMode('login');
    }
  }

  if (mode === 'forgot') {
    return (
      <View className="screen">
        <FormScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <View className="items-center mb-10">
            <Feather name="lock" size={52} color="#3C096C" />
            <Text className="text-[28px] font-bold text-primary-dark mt-3">Redefinir senha</Text>
            <Text className="text-sm text-primary-light text-center mt-2">
              Enviaremos um link para o seu email com instruções para criar uma nova senha.
            </Text>
          </View>

          <Input
            placeholder="Seu email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Button
            title={loading ? 'Enviando...' : 'Enviar link'}
            variant="secondary"
            onPress={handleForgotPassword}
            disabled={loading}
            className="mt-4"
            icon={loading ? undefined : <Feather name="send" size={18} color="#0E0F0C" />}
          />

          <TouchableOpacity className="items-center mt-5" onPress={() => setMode('login')}>
            <Text className="text-primary-dark text-base">Voltar para o login</Text>
          </TouchableOpacity>
        </FormScrollView>
      </View>
    );
  }

  return (
    <View className="screen">
      <FormScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>

        <View className="items-center mb-12">
          <Feather name="shopping-bag" size={64} color="#3C096C" />
          <Text className="text-[32px] font-bold text-dark mt-2">SalesPro</Text>
        </View>

        <View className="w-full">
          {mode === 'register' && (
            <Input
              placeholder="Nome e sobrenome"
              value={name}
              onChangeText={setName}
            />
          )}

          <Input
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Input
            placeholder="Senha"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {mode === 'register' && (
            <Input
              placeholder="Senha novamente"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          )}

          <Button
            title={loading ? 'Carregando...' : (mode === 'login' ? 'Entrar' : 'Cadastrar e entrar')}
            variant="secondary"
            onPress={handleAuth}
            disabled={loading}
            className="mt-4"
          />

          {mode === 'login' && (
            <TouchableOpacity className="items-center my-4" onPress={() => setMode('forgot')}>
              <Text className="text-primary-dark text-base">Esqueceu sua senha?</Text>
            </TouchableOpacity>
          )}

          {mode === 'login' ? (
            <Button
              title="Ainda não tem cadastro? Clique aqui"
              variant="primary-dark"
              onPress={() => setMode('register')}
            />
          ) : (
            <TouchableOpacity className="items-center mt-4" onPress={() => setMode('login')}>
              <Text className="text-primary-dark text-base">Já possui uma conta? Faça login</Text>
            </TouchableOpacity>
          )}
        </View>

      </FormScrollView>
    </View>
  );
}
