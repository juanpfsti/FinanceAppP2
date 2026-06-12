import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useAuthStore } from '../../src/store/useAuthStore';
import { isFirebaseConfigured } from '../../src/services/firebase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuthStore();
  const theme = useTheme();

  const handleLogin = async () => {
    const success = await login(email, password);
    if (!success) {
      Alert.alert('Erro', isFirebaseConfigured ? 'Credenciais inválidas ou usuário não cadastrado no Firebase Auth.' : 'Credenciais inválidas. Tente admin@demo.com / Admin123');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineLarge" style={{ marginBottom: 30, color: theme.colors.primary, fontWeight: 'bold' }}>
        FinanceApp
      </Text>
      
      <TextInput
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      
      <TextInput
        label="Senha"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        secureTextEntry
        style={styles.input}
      />
      
      <Button mode="contained" onPress={handleLogin} style={styles.button} contentStyle={{ paddingVertical: 8 }}>
        Entrar
      </Button>

      <Text style={{ marginTop: 20, color: theme.colors.onSurfaceVariant }}>
        {isFirebaseConfigured
          ? 'Use um usuário cadastrado no Firebase Auth. O papel admin vem do documento users/{uid}.'
          : 'Demo: admin@demo.com | user@demo.com (Senha: Admin123 / User123)'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, alignItems: 'center' },
  input: { width: '100%', marginBottom: 15 },
  button: { width: '100%', marginTop: 10 }
});