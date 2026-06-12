import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useAuthStore } from '../../src/store/useAuthStore';
import { isFirebaseConfigured } from '../../src/services/firebase';

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const { login, signUp } = useAuthStore();
  const theme = useTheme();

  const getFirebaseErrorMessage = (error: any) => {
    const code = error?.code || '';
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Este e-mail já está sendo utilizado por outra conta.';
      case 'auth/weak-password':
        return 'A senha deve conter no mínimo 6 caracteres.';
      case 'auth/invalid-email':
        return 'O formato do e-mail inserido é inválido.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos.';
      default:
        return error?.message || 'Ocorreu um erro inesperado ao processar a requisição.';
    }
  };

  const handleAuth = async () => {
    setErrorMsg(null);
    if (!email || !password || (isSignUp && !name)) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const success = await signUp(email, password, name);
        if (success) {
          Alert.alert('Sucesso', 'Cadastro realizado com sucesso!');
        } else {
          setErrorMsg('Não foi possível concluir o cadastro.');
        }
      } else {
        const success = await login(email, password);
        if (!success) {
          setErrorMsg(
            isFirebaseConfigured
              ? 'Credenciais inválidas ou usuário não cadastrado no Firebase Auth.'
              : 'Credenciais inválidas. Tente admin@demo.com / Admin123'
          );
        }
      }
    } catch (error: any) {
      setErrorMsg(getFirebaseErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.card}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
            {isSignUp ? 'Criar Conta' : 'FinanceApp'}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {isSignUp ? 'Registre-se para gerenciar suas finanças' : 'Acesse sua conta para continuar'}
          </Text>

          {errorMsg && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}
          
          {isSignUp && (
            <TextInput
              label="Nome Completo"
              value={name}
              onChangeText={(text) => { setName(text); setErrorMsg(null); }}
              mode="outlined"
              autoCapitalize="words"
              style={styles.input}
              disabled={isLoading}
              left={<TextInput.Icon icon="account" />}
            />
          )}
          
          <TextInput
            label="E-mail"
            value={email}
            onChangeText={(text) => { setEmail(text); setErrorMsg(null); }}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            disabled={isLoading}
            left={<TextInput.Icon icon="email" />}
          />
          
          <TextInput
            label="Senha"
            value={password}
            onChangeText={(text) => { setPassword(text); setErrorMsg(null); }}
            mode="outlined"
            secureTextEntry
            style={styles.input}
            disabled={isLoading}
            left={<TextInput.Icon icon="lock" />}
          />
          
          <Button
            mode="contained"
            onPress={handleAuth}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
            contentStyle={{ paddingVertical: 6 }}
          >
            {isSignUp ? 'Cadastrar' : 'Entrar'}
          </Button>

          <Button
            mode="text"
            onPress={() => {
              setIsSignUp(!isSignUp);
              setName('');
              setEmail('');
              setPassword('');
              setErrorMsg(null);
            }}
            disabled={isLoading}
            style={styles.toggleButton}
          >
            {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
          </Button>
          
          <Text style={styles.footerText}>
            {isFirebaseConfigured
              ? 'Conectado ao Firebase Auth & Firestore.'
              : 'Modo de demonstração: use admin@demo.com | Admin123'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    padding: 24,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  title: {
    marginBottom: 6,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  toggleButton: {
    marginTop: 12,
  },
  footerText: {
    marginTop: 24,
    textAlign: 'center',
    opacity: 0.5,
    fontSize: 12,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  }
});