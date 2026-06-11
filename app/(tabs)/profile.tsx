import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Animated, TouchableOpacity, Alert } from 'react-native';
import { Button, Text, useTheme, Avatar, Card, Divider, List, IconButton } from 'react-native-paper';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Profile() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } }
    ]);
  };

  const handleAdminPanel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Painel Administrativo', 'Esta funcionalidade está em desenvolvimento');
  };

  const handleEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Editar Perfil', 'Esta funcionalidade está em desenvolvimento');
  };

  const menuItems = [
    { icon: 'account-cog', title: 'Editar Perfil', onPress: handleEditProfile, color: theme.colors.primary },
    { icon: 'bell', title: 'Notificações', onPress: () => {}, color: theme.colors.primary, badge: '3' },
    { icon: 'lock', title: 'Privacidade e Segurança', onPress: () => {}, color: theme.colors.primary },
    { icon: 'cog', title: 'Configurações', onPress: () => {}, color: theme.colors.primary },
    { icon: 'help-circle', title: 'Ajuda e Suporte', onPress: () => {}, color: theme.colors.primary },
  ];

  const getUserInitial = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        
        {/* Header com imagem de fundo */}
        <View style={styles.headerContainer}>
          <LinearGradient colors={[theme.colors.primary, theme.colors.primary + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coverImage} />
          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: scaleAnim }] }]}>
            <Avatar.Text size={110} label={getUserInitial()} style={[styles.avatar, { backgroundColor: theme.colors.surface }]} labelStyle={{ fontSize: 42, color: theme.colors.primary }} />
            <TouchableOpacity onPress={handleEditProfile} style={styles.editIcon}>
              <IconButton icon="pencil" size={20} iconColor="#fff" style={{ backgroundColor: theme.colors.primary, margin: 0 }} onPress={handleEditProfile} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Informações do Usuário */}
        <View style={styles.userInfo}>
          <Text variant="headlineMedium" style={[styles.userName, { color: theme.colors.onSurface }]}>{user?.name || 'Nome do Usuário'}</Text>
          <Text variant="bodyLarge" style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>{user?.email || 'usuario@email.com'}</Text>
        </View>

        {/* Botão do Painel Administrativo */}
        {user?.role === 'admin' && (
          <Button mode="contained-tonal" icon="shield-account" onPress={handleAdminPanel} style={styles.adminButton} buttonColor={theme.colors.primaryContainer} textColor={theme.colors.primary}>
            Painel Administrativo
          </Button>
        )}

        {/* Itens do Menu */}
        <Card style={[styles.menuCard, { backgroundColor: theme.colors.surface, elevation: 2 }]}>
          <Card.Content>
            {menuItems.map((item, index) => (
              <React.Fragment key={item.title}>
                <TouchableOpacity onPress={item.onPress} activeOpacity={0.7}>
                  <View style={styles.menuItem}>
                    <List.Icon icon={item.icon} color={item.color} />
                    <Text variant="bodyLarge" style={[styles.menuTitle, { color: theme.colors.onSurface, flex: 1 }]}>{item.title}</Text>
                    {item.badge && <View style={[styles.badge, { backgroundColor: theme.colors.error }]}><Text style={styles.badgeText}>{item.badge}</Text></View>}
                    <IconButton icon="chevron-right" size={20} iconColor={theme.colors.outline} />
                  </View>
                </TouchableOpacity>
                {index < menuItems.length - 1 && <Divider style={styles.divider} />}
              </React.Fragment>
            ))}
          </Card.Content>
        </Card>

        {/* Informações do App */}
        <Card style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content>
            <Text variant="labelMedium" style={[styles.infoText, { color: theme.colors.outline }]}>FinanceApp Versão Beta 1.0.0</Text>
            <Text variant="labelSmall" style={[styles.copyrightText, { color: theme.colors.outline }]}>© 2026 FinanceApp. Todos os direitos reservados.</Text>
          </Card.Content>
        </Card>

        {/* Botão Sair */}
        <Button mode="outlined" icon="logout" onPress={handleLogout} style={[styles.logoutButton, { borderColor: theme.colors.error }]} textColor={theme.colors.error} buttonColor="transparent">
          Sair da Conta
        </Button>

        <View style={{ height: 30 }} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { position: 'relative', marginBottom: 50 },
  coverImage: { height: 160, width: '100%' },
  avatarContainer: { position: 'absolute', bottom: -55, alignSelf: 'center' },
  avatar: { elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4 },
  editIcon: { position: 'absolute', bottom: 2, right: 2 },
  userInfo: { alignItems: 'center', marginTop: 70, marginBottom: 28, paddingHorizontal: 20 },
  userName: { fontWeight: '700', fontSize: 26, marginBottom: 6 },
  userEmail: { fontSize: 15, opacity: 0.8 },
  adminButton: { marginHorizontal: 20, marginBottom: 24, borderRadius: 14, paddingVertical: 2 },
  menuCard: { marginHorizontal: 20, marginBottom: 24, borderRadius: 20, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  menuTitle: { marginLeft: 12, fontSize: 16 },
  divider: { marginVertical: 2 },
  badge: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3, marginRight: 8 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  infoCard: { marginHorizontal: 20, marginBottom: 24, borderRadius: 16 },
  infoText: { textAlign: 'center', fontSize: 12, letterSpacing: 0.3 },
  copyrightText: { textAlign: 'center', fontSize: 11, marginTop: 6, opacity: 0.7 },
  logoutButton: { marginHorizontal: 20, marginBottom: 40, borderRadius: 14, borderWidth: 1.5, paddingVertical: 2 },
});