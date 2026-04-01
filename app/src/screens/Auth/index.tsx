import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Input, Button } from '../../components';
import { colors, typography } from '../../theme';
import { supabase } from '../../services/supabase';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Para cadastro:
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha email e senha.');
      return;
    }

    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Erro no Login', error.message);
      } else {
        Alert.alert('Sucesso', 'Login realizado com sucesso!');
      }
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
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        Alert.alert('Erro no Cadastro', error.message);
      } else {
        Alert.alert('Sucesso', 'Confira seu email para verificar sua conta!');
        // Opcional: Voltar para a tela de login
        setIsLogin(true);
      }
    }

    setLoading(false);
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Feather name="shopping-bag" size={64} color={colors.primary.dark} />
          <Text style={styles.logoText}>SalesPro</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
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
            style={styles.submitButton}
          />

          {isLogin && (
            <TouchableOpacity style={styles.forgotPasswordButton}>
              <Text style={styles.forgotPasswordText}>Esqueceu sua senha? Clique aqui</Text>
            </TouchableOpacity>
          )}

          {isLogin ? (
            <Button 
              title="Ainda não tem cadastro? Clique aqui" 
              variant="primary-dark"
              onPress={() => setIsLogin(false)}
            />
          ) : (
            <TouchableOpacity style={styles.toggleModeButton} onPress={() => setIsLogin(true)}>
              <Text style={styles.toggleModeText}>Ja possui uma conta? Faça login</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.main,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.dark.main,
    marginTop: 8,
  },
  formContainer: {
    width: '100%',
  },
  submitButton: {
    marginTop: 16,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginVertical: 16,
  },
  forgotPasswordText: {
    color: colors.primary.dark,
    fontSize: parseInt(typography.sizes.corpo, 10) || 16,
  },
  toggleModeButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  toggleModeText: {
    color: colors.primary.dark,
    fontSize: parseInt(typography.sizes.corpo, 10) || 16,
  },
});
