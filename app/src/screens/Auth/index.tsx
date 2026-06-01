import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Input, Button } from '../../components';
import { supabase } from '../../services/supabase';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha email e senha.');
      return;
    }

    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) Alert.alert('Erro no Login', error.message);
      else Alert.alert('Sucesso', 'Login realizado com sucesso!');
    } else {
      if (password !== confirmPassword) {
        Alert.alert('Erro', 'As senhas não coincidem.');
        setLoading(false);
        return;
      }
      if (!name) {
        Alert.alert('Erro', 'Por favor, preencha seu nome.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });

      if (error) Alert.alert('Erro no Cadastro', error.message);
      else {
        Alert.alert('Sucesso', 'Confira seu email para verificar sua conta!');
        setIsLogin(true);
      }
    }

    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      className="screen"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>

        <View className="items-center mb-12">
          <Feather name="shopping-bag" size={64} color="#3C096C" />
          <Text className="text-[32px] font-bold text-dark mt-2">SalesPro</Text>
        </View>

        <View className="w-full">
          {!isLogin && (
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

          {!isLogin && (
            <Input
              placeholder="Senha novamente"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          )}

          <Button
            title={loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar e entrar')}
            variant="secondary"
            onPress={handleAuth}
            disabled={loading}
            className="mt-4"
          />

          {isLogin && (
            <TouchableOpacity className="items-center my-4">
              <Text className="text-primary-dark text-base">Esqueceu sua senha? Clique aqui</Text>
            </TouchableOpacity>
          )}

          {isLogin ? (
            <Button
              title="Ainda não tem cadastro? Clique aqui"
              variant="primary-dark"
              onPress={() => setIsLogin(false)}
            />
          ) : (
            <TouchableOpacity className="items-center mt-4" onPress={() => setIsLogin(true)}>
              <Text className="text-primary-dark text-base">Ja possui uma conta? Faça login</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
