import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { useColorScheme, View, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { useAuthStore } from '../src/store/useAuthStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Ouvinte do evento de instalação do PWA (para navegadores baseados no Chromium)
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).deferredPrompt = e;
  });
}

// Cores personalizadas para o tema (mantendo MD3 mas customizando)
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6366f1',      // Indigo moderno
    primaryContainer: '#e0e7ff',
    secondary: '#8b5cf6',    // Roxo
    tertiary: '#06b6d4',     // Ciano
    outline: '#94a3b8',      // Cinza para bordas/ícones inativos
    surface: '#ffffff',
    surfaceVariant: '#f8fafc',
    background: '#f8fafc',
  },
  roundness: 12,
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818cf8',      // Indigo mais claro
    primaryContainer: '#1e1b4b',
    secondary: '#a78bfa',
    tertiary: '#22d3ee',
    outline: '#64748b',
    surface: '#1e293b',
    surfaceVariant: '#0f172a',
    background: '#0f172a',
  },
  roundness: 12,
};

export default function RootLayout() {
  const { user, isLoading, checkSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  // 1. Tenta recuperar a sessão ao abrir o app
  useEffect(() => {
    checkSession();
  }, []);

  // 2. Monitora o estado de autenticação e redireciona
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Sem usuário e fora da tela de login -> Vai para o Login
      router.replace('/(auth)/login');
    } else if (user && (inAuthGroup || segments.length === 1)) {
      // Logado e tentando ir pro login ou raiz -> Vai para o Dashboard
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  // Tela de loading mais bonita
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {Platform.OS === 'web' && (
            <style dangerouslySetInnerHTML={{ __html: `
              /* Estilo de barra de rolagem customizada e moderna apenas para desktop/mouse */
              @media (pointer: fine) {
                ::-webkit-scrollbar {
                  width: 8px;
                  height: 8px;
                }
                ::-webkit-scrollbar-track {
                  background: rgba(0,0,0,0.02);
                  border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb {
                  background: ${theme.colors.primary}50;
                  border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                  background: ${theme.colors.primary};
                }
              }
              body {
                background-color: ${theme.colors.background};
              }
            `}} />
          )}
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </SafeAreaView>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}