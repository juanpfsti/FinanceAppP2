import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Animated, TouchableOpacity, Alert, Platform, Modal, TouchableWithoutFeedback, Switch } from 'react-native';
import { Button, Text, useTheme, Avatar, Card, Divider, List, IconButton, TextInput, SegmentedButtons } from 'react-native-paper';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from '../../src/utils/i18n';

export default function Profile() {
  const { user, logout, updateProfile, updatePassword, deleteAccount } = useAuthStore();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Estados dos Modais de Funcionalidades
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');

  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(user?.pushNotifications ?? true);
  const [weeklySummaries, setWeeklySummaries] = useState(user?.weeklySummaries ?? true);
  const [expenseAlerts, setExpenseAlerts] = useState(user?.expenseAlerts ?? true);

  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [language, setLanguage] = useState(user?.language || 'pt');
  const [currency, setCurrency] = useState(user?.currency || 'BRL');

  const [supportVisible, setSupportVisible] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditEmail(user.email);
      setPushEnabled(user.pushNotifications ?? true);
      setWeeklySummaries(user.weeklySummaries ?? true);
      setExpenseAlerts(user.expenseAlerts ?? true);
      setLanguage(user.language || 'pt');
      setCurrency(user.currency || 'BRL');
    }
  }, [user]);

  const handleTogglePush = async (val: boolean) => {
    setPushEnabled(val);
    try {
      await updateProfile({ pushNotifications: val });
    } catch {
      Alert.alert(t('error'), t('alertErrorProfile'));
    }
  };

  const handleToggleWeekly = async (val: boolean) => {
    setWeeklySummaries(val);
    try {
      await updateProfile({ weeklySummaries: val });
    } catch {
      Alert.alert(t('error'), t('alertErrorProfile'));
    }
  };

  const handleToggleAlerts = async (val: boolean) => {
    setExpenseAlerts(val);
    try {
      await updateProfile({ expenseAlerts: val });
    } catch {
      Alert.alert(t('error'), t('alertErrorProfile'));
    }
  };

  // Função para abrir seleção de foto (Câmera ou Galeria)
  const handlePhotoSelect = async (source: 'camera' | 'library') => {
    setPhotoModalVisible(false);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            user?.language === 'en' ? 'Permission Required' : 'Permissão necessária',
            user?.language === 'en' ? 'We need access to the camera to take a profile picture.' : 'Precisamos de acesso à câmera para tirar a foto de perfil.'
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.3,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            user?.language === 'en' ? 'Permission Required' : 'Permissão necessária',
            user?.language === 'en' ? 'We need access to your photos to select an image.' : 'Precisamos de acesso às suas fotos para selecionar uma imagem.'
          );
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.3,
          base64: true,
        });
      }

      if (!result.canceled && result.assets?.[0]?.base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await updateProfile({ photoUrl: base64Image });
        Alert.alert(t('success'), t('alertSuccessProfile'));
      }
    } catch (error) {
      console.error('Erro ao gerenciar imagem:', error);
      Alert.alert(t('error'), user?.language === 'en' ? 'Could not update profile picture.' : 'Não foi possível atualizar a imagem de perfil.');
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoModalVisible(false);
    try {
      await updateProfile({ photoUrl: undefined });
      Alert.alert(t('success'), user?.language === 'en' ? 'Profile picture removed successfully!' : 'Foto de perfil removida com sucesso!');
    } catch {
      Alert.alert(t('error'), user?.language === 'en' ? 'Error removing profile picture.' : 'Erro ao remover foto de perfil.');
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      Alert.alert(t('error'), t('alertFillAll'));
      return;
    }
    try {
      await updateProfile({ name: editName.trim(), email: editEmail.trim() });
      setEditProfileVisible(false);
      Alert.alert(t('success'), t('alertSuccessProfile'));
    } catch {
      Alert.alert(t('error'), t('alertErrorProfile'));
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert(t('error'), t('alertPassMin'));
      return;
    }
    try {
      await updatePassword(newPassword);
      Alert.alert(t('success'), t('alertPassSuccess'));
      setNewPassword('');
      setPrivacyVisible(false);
    } catch {
      Alert.alert(t('error'), user?.language === 'en' ? 'Could not update password.' : 'Não foi possível atualizar a senha.');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateProfile({ language, currency });
      setSettingsVisible(false);
      Alert.alert(t('success'), user?.language === 'en' ? 'Settings saved successfully!' : 'Configurações salvas com sucesso!');
    } catch {
      Alert.alert(t('error'), user?.language === 'en' ? 'Could not save settings.' : 'Não foi possível salvar as configurações.');
    }
  };

  const handleDeleteAccount = () => {
    const confirmMsg = t('deleteAccountConfirm');
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm(confirmMsg);
      if (confirmDelete) {
        void deleteAccount().then(() => {
          router.replace('/(auth)/login');
          Alert.alert(t('success'), t('alertDeleteSuccess'));
        }).catch(() => {
          Alert.alert(t('error'), user?.language === 'en' ? 'Could not delete account. Reauthenticate and try again.' : 'Não foi possível excluir a conta. Faça login novamente e tente.');
        });
      }
    } else {
      Alert.alert(t('deleteAccount'), confirmMsg, [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: async () => {
          try {
            await deleteAccount();
            router.replace('/(auth)/login');
            Alert.alert(t('success'), t('alertDeleteSuccess'));
          } catch {
            Alert.alert(t('error'), 'Não foi possível excluir a conta.');
          }
        }}
      ]);
    }
  };

  const handleLogout = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const confirmTitle = t('logoutConfirmTitle');
    const confirmMsg = t('logoutConfirmMsg');
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm(confirmMsg);
      if (confirmLogout) {
        void logout().then(() => {
          router.replace('/(auth)/login');
        });
      }
    } else {
      Alert.alert(confirmTitle, confirmMsg, [
        { text: t('cancel'), style: 'cancel' },
        { text: confirmTitle, style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } }
      ]);
    }
  };

  const handleAdminPanel = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Alert.alert('Painel Administrativo', 'Funcionalidade exclusiva para administradores (em desenvolvimento).');
  };

  const menuItems = [
    { icon: 'account-cog', title: t('editProfile'), onPress: () => setEditProfileVisible(true), color: theme.colors.primary },
    { icon: 'bell', title: t('notifications'), onPress: () => setNotificationsVisible(true), color: theme.colors.primary },
    { icon: 'lock', title: t('privacySecurity'), onPress: () => setPrivacyVisible(true), color: theme.colors.primary },
    { icon: 'cog', title: t('settings'), onPress: () => setSettingsVisible(true), color: theme.colors.primary },
    { icon: 'help-circle', title: t('helpSupport'), onPress: () => setSupportVisible(true), color: theme.colors.primary },
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
      showsVerticalScrollIndicator={Platform.OS === 'web'}
    >
      <View style={styles.responsiveWrapper}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          {/* Header com imagem de fundo */}
          <View style={styles.headerContainer}>
            <LinearGradient colors={[theme.colors.primary, theme.colors.primary + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coverImage} />
            <Animated.View style={[styles.avatarContainer, { transform: [{ scale: scaleAnim }] }]}>
              <TouchableOpacity onPress={() => setPhotoModalVisible(true)} activeOpacity={0.85}>
                {user?.photoUrl ? (
                  <Avatar.Image size={110} source={{ uri: user.photoUrl }} style={[styles.avatar, { backgroundColor: theme.colors.surface }]} />
                ) : (
                  <Avatar.Text size={110} label={getUserInitial()} style={[styles.avatar, { backgroundColor: theme.colors.surface }]} labelStyle={{ fontSize: 42, color: theme.colors.primary }} />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPhotoModalVisible(true)} style={styles.editIcon}>
                <IconButton icon="camera" size={20} iconColor="#fff" style={{ backgroundColor: theme.colors.primary, margin: 0 }} onPress={() => setPhotoModalVisible(true)} />
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Informações do Usuário */}
          <View style={styles.userInfo}>
            <Text variant="headlineMedium" style={[styles.userName, { color: theme.colors.onSurface }]}>{user?.name || (user?.language === 'en' ? 'User Name' : 'Nome do Usuário')}</Text>
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
            <Card.Content style={{ paddingHorizontal: 8 }}>
              {menuItems.map((item, index) => (
                <React.Fragment key={item.title}>
                  <TouchableOpacity onPress={item.onPress} activeOpacity={0.7}>
                    <View style={styles.menuItem}>
                      <List.Icon icon={item.icon} color={item.color} />
                      <Text variant="bodyLarge" style={[styles.menuTitle, { color: theme.colors.onSurface, flex: 1 }]}>{item.title}</Text>
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
              <Text variant="labelMedium" style={[styles.infoText, { color: theme.colors.outline }]}>FinanceApp Versão Beta 1.1.0 (PWA)</Text>
              <Text variant="labelSmall" style={[styles.copyrightText, { color: theme.colors.outline }]}>© 2026 FinanceApp. {user?.language === 'en' ? 'All rights reserved.' : 'Todos os direitos reservados.'}</Text>
            </Card.Content>
          </Card>

          {/* Botão Sair */}
          <Button mode="outlined" icon="logout" onPress={handleLogout} style={[styles.logoutButton, { borderColor: theme.colors.error }]} textColor={theme.colors.error} buttonColor="transparent">
            {t('logout')}
          </Button>

          <View style={{ height: 30 }} />
        </Animated.View>
      </View>

      {/* Modal: Opções da Foto de Perfil */}
      <Modal visible={photoModalVisible} transparent animationType="fade" onRequestClose={() => setPhotoModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setPhotoModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <Text variant="titleMedium" style={styles.modalTitle}>{user?.language === 'en' ? 'Change Profile Picture' : 'Alterar Imagem de Perfil'}</Text>
                
                <TouchableOpacity onPress={() => handlePhotoSelect('camera')} style={styles.modalOption}>
                  <IconButton icon="camera" iconColor={theme.colors.primary} />
                  <Text variant="bodyLarge">{user?.language === 'en' ? 'Take Photo (Camera)' : 'Tirar Foto (Câmera)'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handlePhotoSelect('library')} style={styles.modalOption}>
                  <IconButton icon="image-multiple" iconColor={theme.colors.primary} />
                  <Text variant="bodyLarge">{user?.language === 'en' ? 'Choose from Gallery' : 'Escolher da Galeria'}</Text>
                </TouchableOpacity>
                
                {user?.photoUrl && (
                  <TouchableOpacity onPress={handleRemovePhoto} style={styles.modalOption}>
                    <IconButton icon="delete" iconColor={theme.colors.error} />
                    <Text variant="bodyLarge" style={{ color: theme.colors.error }}>{user?.language === 'en' ? 'Remove Current Photo' : 'Remover Foto Atual'}</Text>
                  </TouchableOpacity>
                )}
                
                <Divider style={{ marginVertical: 8 }} />
                <Button mode="text" onPress={() => setPhotoModalVisible(false)}>{t('cancel')}</Button>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal: Editar Perfil */}
      <Modal visible={editProfileVisible} transparent animationType="fade" onRequestClose={() => setEditProfileVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setEditProfileVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <Text variant="titleLarge" style={styles.modalTitle}>{t('editProfile')}</Text>
                
                <TextInput label={t('fullName')} value={editName} onChangeText={setEditName} mode="outlined" style={styles.input} />
                <TextInput label={t('email')} value={editEmail} onChangeText={setEditEmail} mode="outlined" style={styles.input} keyboardType="email-address" />
                
                <View style={styles.modalButtonsRow}>
                  <Button mode="outlined" onPress={() => setEditProfileVisible(false)} style={styles.modalButton}>{t('cancel')}</Button>
                  <Button mode="contained" onPress={handleSaveProfile} style={styles.modalButton}>{t('save')}</Button>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal: Notificações */}
      <Modal visible={notificationsVisible} transparent animationType="fade" onRequestClose={() => setNotificationsVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setNotificationsVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <Text variant="titleLarge" style={styles.modalTitle}>{t('notifications')}</Text>
                
                <View style={styles.switchRow}>
                  <Text variant="bodyLarge">{t('pushNotifications')}</Text>
                  <Switch value={pushEnabled} onValueChange={handleTogglePush} trackColor={{ true: theme.colors.primary }} />
                </View>
                <Divider style={{ marginVertical: 8 }} />
                <View style={styles.switchRow}>
                  <Text variant="bodyLarge">{t('weeklySummaries')}</Text>
                  <Switch value={weeklySummaries} onValueChange={handleToggleWeekly} trackColor={{ true: theme.colors.primary }} />
                </View>
                <Divider style={{ marginVertical: 8 }} />
                <View style={styles.switchRow}>
                  <Text variant="bodyLarge">{t('expenseAlerts')}</Text>
                  <Switch value={expenseAlerts} onValueChange={handleToggleAlerts} trackColor={{ true: theme.colors.primary }} />
                </View>
                
                <Button mode="contained" onPress={() => setNotificationsVisible(false)} style={{ marginTop: 20 }}>{t('finish')}</Button>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal: Privacidade e Segurança */}
      <Modal visible={privacyVisible} transparent animationType="fade" onRequestClose={() => setPrivacyVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setPrivacyVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <Text variant="titleLarge" style={styles.modalTitle}>{t('privacySecurity')}</Text>
                
                <TextInput label={t('newPassword')} value={newPassword} onChangeText={setNewPassword} mode="outlined" secureTextEntry style={styles.input} />
                
                <Button mode="contained" onPress={handleSavePassword} style={styles.input}>{t('changePassword')}</Button>
                
                <Divider style={{ marginVertical: 12 }} />
                
                <Button mode="outlined" icon="delete" onPress={handleDeleteAccount} style={{ borderColor: theme.colors.error }} textColor={theme.colors.error}>
                  {t('deleteAccount')}
                </Button>
                
                <Button mode="text" onPress={() => setPrivacyVisible(false)} style={{ marginTop: 12 }}>{t('close')}</Button>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal: Configurações */}
      <Modal visible={settingsVisible} transparent animationType="fade" onRequestClose={() => setSettingsVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setSettingsVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <Text variant="titleLarge" style={styles.modalTitle}>{t('settings')}</Text>
                
                <Text variant="labelMedium" style={{ marginBottom: 6 }}>{t('appLanguage')}</Text>
                <SegmentedButtons value={language} onValueChange={setLanguage} buttons={[{ value: 'pt', label: 'Português' }, { value: 'en', label: 'English' }]} style={styles.input} />
                
                <Text variant="labelMedium" style={{ marginBottom: 6 }}>{t('defaultCurrency')}</Text>
                <SegmentedButtons value={currency} onValueChange={setCurrency} buttons={[{ value: 'BRL', label: 'BRL (R$)' }, { value: 'USD', label: 'USD ($)' }]} style={styles.input} />
                
                <Button mode="contained" onPress={handleSaveSettings}>{t('saveSettings')}</Button>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal: Ajuda e Suporte */}
      <Modal visible={supportVisible} transparent animationType="fade" onRequestClose={() => setSupportVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setSupportVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <Text variant="titleLarge" style={styles.modalTitle}>{t('helpSupport')}</Text>
                
                <ScrollView style={{ maxHeight: 280, marginBottom: 12 }} showsVerticalScrollIndicator={true}>
                  {/* Pergunta 1 */}
                  <TouchableOpacity onPress={() => setActiveQuestion(activeQuestion === 1 ? null : 1)} activeOpacity={0.7}>
                    <View style={styles.supportQuestionRow}>
                      <Text variant="titleMedium" style={[styles.supportQuestion, { color: theme.colors.onSurface, flex: 1 }]}>{t('helpQ1')}</Text>
                      <IconButton icon={activeQuestion === 1 ? 'chevron-up' : 'chevron-down'} size={20} iconColor={theme.colors.primary} style={{ margin: 0 }} />
                    </View>
                  </TouchableOpacity>
                  {activeQuestion === 1 && (
                    <Text variant="bodyMedium" style={[styles.supportAnswer, { color: theme.colors.onSurfaceVariant, paddingBottom: 8 }]}>{t('helpA1')}</Text>
                  )}
                  
                  <Divider style={{ marginVertical: 8 }} />
                  
                  {/* Pergunta 2 */}
                  <TouchableOpacity onPress={() => setActiveQuestion(activeQuestion === 2 ? null : 2)} activeOpacity={0.7}>
                    <View style={styles.supportQuestionRow}>
                      <Text variant="titleMedium" style={[styles.supportQuestion, { color: theme.colors.onSurface, flex: 1 }]}>{t('helpQ2')}</Text>
                      <IconButton icon={activeQuestion === 2 ? 'chevron-up' : 'chevron-down'} size={20} iconColor={theme.colors.primary} style={{ margin: 0 }} />
                    </View>
                  </TouchableOpacity>
                  {activeQuestion === 2 && (
                    <Text variant="bodyMedium" style={[styles.supportAnswer, { color: theme.colors.onSurfaceVariant, paddingBottom: 8 }]}>{t('helpA2')}</Text>
                  )}
 
                  <Divider style={{ marginVertical: 8 }} />
                  
                  {/* Pergunta 3 */}
                  <TouchableOpacity onPress={() => setActiveQuestion(activeQuestion === 3 ? null : 3)} activeOpacity={0.7}>
                    <View style={styles.supportQuestionRow}>
                      <Text variant="titleMedium" style={[styles.supportQuestion, { color: theme.colors.onSurface, flex: 1 }]}>{t('helpQ3')}</Text>
                      <IconButton icon={activeQuestion === 3 ? 'chevron-up' : 'chevron-down'} size={20} iconColor={theme.colors.primary} style={{ margin: 0 }} />
                    </View>
                  </TouchableOpacity>
                  {activeQuestion === 3 && (
                    <Text variant="bodyMedium" style={[styles.supportAnswer, { color: theme.colors.onSurfaceVariant, paddingBottom: 8 }]}>{t('helpA3')}</Text>
                  )}
                </ScrollView>
                
                <Text variant="bodySmall" style={{ textAlign: 'center', opacity: 0.7, marginVertical: 8 }}>{t('supportContact')}</Text>
                
                <Button mode="contained" onPress={() => setSupportVisible(false)}>{t('close')}</Button>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  responsiveWrapper: {
    maxWidth: Platform.OS === 'web' ? 600 : '100%',
    width: '100%',
    alignSelf: 'center',
  },
  headerContainer: { position: 'relative', marginBottom: 50 },
  coverImage: { height: 160, width: '100%' },
  avatarContainer: { position: 'absolute', bottom: -55, alignSelf: 'center' },
  avatar: { elevation: 6 },
  editIcon: { position: 'absolute', bottom: 2, right: 2 },
  userInfo: { alignItems: 'center', marginTop: 70, marginBottom: 28, paddingHorizontal: 20 },
  userName: { fontWeight: '700', fontSize: 26, marginBottom: 6 },
  userEmail: { fontSize: 15, opacity: 0.8 },
  adminButton: { marginHorizontal: 20, marginBottom: 24, borderRadius: 14, paddingVertical: 2 },
  menuCard: { marginHorizontal: 20, marginBottom: 24, borderRadius: 20, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  menuTitle: { marginLeft: 12, fontSize: 16 },
  divider: { marginVertical: 2 },
  infoCard: { marginHorizontal: 20, marginBottom: 24, borderRadius: 16 },
  infoText: { textAlign: 'center', fontSize: 12, letterSpacing: 0.3 },
  copyrightText: { textAlign: 'center', fontSize: 11, marginTop: 6, opacity: 0.7 },
  logoutButton: { marginHorizontal: 20, marginBottom: 40, borderRadius: 14, borderWidth: 1.5, paddingVertical: 2 },
  
  // Modais comuns
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxWidth: 380, borderRadius: 24, padding: 24, elevation: 5 },
  modalTitle: { fontWeight: 'bold', fontSize: 20, marginBottom: 18, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderRadius: 12 },
  input: { marginBottom: 16, backgroundColor: 'transparent' },
  modalButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalButton: { flex: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  supportQuestion: { fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  supportAnswer: { fontSize: 13, opacity: 0.8 },
  supportQuestionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
});