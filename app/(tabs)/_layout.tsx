import { Tabs } from 'expo-router';
import { Home, PlusCircle, User } from 'lucide-react-native';
import { useTheme } from 'react-native-paper';
import { Animated, Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Componente de ícone com animação melhorada
function AnimatedTabIcon({ Icon, color, focused, label }: { Icon: any; color: string; focused: boolean; label?: string }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (focused) {
      // Feedback tátil mais sutil
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      // Animação de "destaque" quando ganha foco
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: -6,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Volta ao normal com animação suave
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
        opacity: opacityAnim,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon color={color} size={focused ? 26 : 24} />
      {focused && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: -8,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: color,
            transform: [{ scale: scaleAnim }],
          }}
        />
      )}
    </Animated.View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        
        // Header completamente removido
        headerShown: false,
        
        // TabBar estilizada com suporte à área segura
        tabBarStyle: { 
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outline + '15',
          height: Platform.OS === 'ios' ? 85 + insets.bottom : 65 + insets.bottom,
          paddingBottom: Platform.OS === 'ios' ? 25 + insets.bottom : 10 + insets.bottom,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 0 : 4,
        },
        
        animation: 'shift',
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Início',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={Home} color={color} focused={focused} label="Início" />
          ),
        }} 
      />
      <Tabs.Screen 
        name="add" 
        options={{ 
          title: 'Novo',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={PlusCircle} color={color} focused={focused} label="Novo" />
          ),
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Perfil',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon Icon={User} color={color} focused={focused} label="Perfil" />
          ),
        }} 
      />
    </Tabs>
  );
}