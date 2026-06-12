import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, TouchableOpacity, Modal as RNModal, TouchableWithoutFeedback, Dimensions, Animated, Alert, Platform } from 'react-native';
import { Text, Card, useTheme, IconButton, Chip, ActivityIndicator, Button as PaperButton, Divider } from 'react-native-paper';
import { useFinanceStore } from '../../src/store/useFinanceStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import * as Location from 'expo-location';
import { WeatherService } from '../../src/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditTransactionModal from '../../src/components/EditTransactionModal';
import PlanningModal from '../../src/components/PlanningModal';
import { useTranslation } from '../../src/utils/i18n';

const { width } = Dimensions.get('window');

const formatCurrency = (value: number, currencyCode: string = 'BRL'): string => {
  const locale = currencyCode === 'USD' ? 'en-US' : 'pt-BR';
  return value.toLocaleString(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function Dashboard() {
  const { transactions, loadTransactions, updateTransaction, deleteTransaction, isLoading } = useFinanceStore();
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();
  
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [weather, setWeather] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [planningModalVisible, setPlanningModalVisible] = useState(false);
  
  // Estados para PWA
  const [pwaModalVisible, setPwaModalVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Hook para verificar a prontidão do PWA
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Verifica se já foi dispensado (persiste por 7 dias)
      const dismissedAt = localStorage.getItem('pwa-prompt-dismissed-at');
      if (dismissedAt) {
        const daysSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismiss < 7) return;
      }

      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOS(isIOSDevice);

      // Verifica se já está instalado (standalone)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      
      if (!isStandalone) {
        if (isIOSDevice) {
          // No iOS exibe as instruções depois de 3 segundos
          const timer = setTimeout(() => {
            setPwaModalVisible(true);
          }, 3000);
          return () => clearTimeout(timer);
        } else {
          // No Android/Chromium verifica periodicamente se o banner está pronto
          const checkPrompt = setInterval(() => {
            if ((window as any).deferredPrompt) {
              setPwaModalVisible(true);
              clearInterval(checkPrompt);
            }
          }, 1000);
          
          const maxTimer = setTimeout(() => clearInterval(checkPrompt), 12000);
          return () => {
            clearInterval(checkPrompt);
            clearTimeout(maxTimer);
          };
        }
      }
    }
  }, [user]);

  const handleClosePwa = () => {
    setPwaModalVisible(false);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.setItem('pwa-prompt-dismissed-at', Date.now().toString());
    }
  };
  
  // Animações dos modais
  const actionModalAnim = useState(new Animated.Value(0))[0];
  const deleteModalAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    fetchWeather();
    if (user?.id) {
      loadTransactions(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (actionModalVisible) {
      Animated.spring(actionModalAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start();
    } else {
      Animated.spring(actionModalAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }).start();
    }
  }, [actionModalVisible]);

  useEffect(() => {
    if (deleteModalVisible) {
      Animated.spring(deleteModalAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start();
    } else {
      Animated.spring(deleteModalAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }).start();
    }
  }, [deleteModalVisible]);

  const fetchWeather = async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                const weatherData = await WeatherService.getWeather(position.coords.latitude, position.coords.longitude);
                if (weatherData?.weather) setWeather(weatherData);
              } catch (e) {
                console.log('Erro ao buscar clima (fetch):', e);
              }
            },
            (err) => {
              console.log('Erro de geolocalização web:', err.message);
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
          );
        }
        return;
      }

      // Plataformas nativas (iOS/Android)
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      const lastKnown = await Location.getLastKnownPositionAsync({});
      let coords = lastKnown?.coords;
      
      if (!coords) {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        coords = location.coords;
      }
      
      if (coords) {
        const weatherData = await WeatherService.getWeather(coords.latitude, coords.longitude);
        if (weatherData?.weather) setWeather(weatherData);
      }
    } catch (error) {
      console.log('Erro ao buscar clima:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions(user?.id);
    await fetchWeather();
    setRefreshing(false);
  };

  const balance = transactions.reduce((acc, curr) => {
    const amount = Number(curr.amount) || 0;
    return curr.type === 'receita' ? acc + amount : acc - amount;
  }, 0);

  const totalIncome = transactions.filter(t => t.type === 'receita').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalExpenses = transactions.filter(t => t.type === 'despesa').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  
  const getFilteredTransactions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return transactions.filter(t => {
      const txDate = new Date(t.date);
      if (selectedPeriod === 'today') return txDate >= today;
      if (selectedPeriod === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return txDate >= weekAgo;
      }
      if (selectedPeriod === 'month') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return txDate >= monthAgo;
      }
      return true;
    });
  };

  const filteredTransactions = getFilteredTransactions();
  const recentTransactions = filteredTransactions.slice(0, 5);

  const getWeatherIcon = (condition: string) => {
    const iconMap: Record<string, string> = {
      clear: 'weather-sunny', clouds: 'weather-cloudy', rain: 'weather-rainy',
      thunderstorm: 'weather-lightning', snow: 'weather-snowy',
    };
    return iconMap[condition?.toLowerCase()] || 'weather-cloudy';
  };

  const openActionModal = (transaction: any) => {
    setSelectedTransaction(transaction);
    setActionModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeActionModal = () => {
    setActionModalVisible(false);
  };

  const handleEdit = () => {
    closeActionModal();
    setTimeout(() => setEditModalVisible(true), 200);
  };

  const handleDelete = () => {
    closeActionModal();
    setTimeout(() => setDeleteModalVisible(true), 200);
  };

  const confirmDelete = async () => {
    setDeleteModalVisible(false);
    if (selectedTransaction) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await deleteTransaction(selectedTransaction.id);
        await loadTransactions(user?.id);
        setSelectedTransaction(null);
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível excluir o lançamento');
      }
    }
  };

  const handleSaveEdit = async (id: string, updatedData: any) => {
    await updateTransaction(id, updatedData);
    await loadTransactions(user?.id);
    setEditModalVisible(false);
    setSelectedTransaction(null);
  };

  if (isLoading && transactions.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 80 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
    >
      <View style={styles.responsiveWrapper}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View>
            <Text variant="bodyMedium" style={[styles.welcomeText, { color: theme.colors.onSurfaceVariant }]}>
              {t('welcome')}
            </Text>
            <Text variant="headlineMedium" style={[styles.userName, { color: theme.colors.onSurface }]}>
              {user?.name?.split(' ')[0] || (user?.language === 'en' ? 'User' : 'Usuário')}
            </Text>
          </View>
          <IconButton icon="bell-outline" size={24} iconColor={theme.colors.primary} onPress={() => {}} />
        </View>

        {/* Card do Clima */}
        {weather?.weather?.[0] && (
          <TouchableOpacity onPress={fetchWeather} activeOpacity={0.7}>
            <Card style={[styles.weatherCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Card.Content style={styles.weatherContent}>
                <View style={styles.weatherLeft}>
                  <IconButton icon={getWeatherIcon(weather.weather[0].main)} size={28} iconColor={theme.colors.primary} />
                  <View>
                    <Text variant="bodyLarge" style={styles.weatherTemp}>{weather.weather[0].description}</Text>
                    <Text variant="bodySmall" style={[styles.weatherFeels, { color: theme.colors.onSurfaceVariant }]}>
                      {weather.main?.temp}°C • Sensação {weather.main?.feels_like}°C
                    </Text>
                  </View>
                </View>
                <Text variant="headlineSmall" style={styles.weatherTempNumber}>{Math.round(weather.main?.temp)}°</Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )}

        {/* Stats Container */}
        <View style={styles.statsContainer}>
          <Card style={[styles.statsCard, { backgroundColor: '#10b981' }]}>
            <Card.Content style={styles.statsCardContent}>
              <Text variant="bodyMedium" style={styles.statsLabel}>{t('income')}</Text>
              <Text variant="headlineMedium" style={styles.statsValue}>{formatCurrency(totalIncome, user?.currency)}</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.statsCard, { backgroundColor: '#ef4444' }]}>
            <Card.Content style={styles.statsCardContent}>
              <Text variant="bodyMedium" style={styles.statsLabel}>{t('expenses')}</Text>
              <Text variant="headlineMedium" style={styles.statsValue}>{formatCurrency(totalExpenses, user?.currency)}</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Balance Card */}
        <Card style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}>
          <LinearGradient colors={[theme.colors.primary, theme.colors.primary + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceGradient}>
            <Card.Content style={styles.balanceContent}>
              <Text variant="bodyMedium" style={styles.balanceLabel}>{t('balance')}</Text>
              <Text variant="displaySmall" style={styles.balanceAmount}>{formatCurrency(balance, user?.currency)}</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                <IconButton icon="refresh" size={20} iconColor="#fff" />
                <Text variant="bodySmall" style={styles.balanceUpdateText}>{t('updatedNow')}</Text>
              </TouchableOpacity>
            </Card.Content>
          </LinearGradient>
        </Card>

        {/* Transactions Section */}
        <View style={styles.sectionHeader}>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{t('recentTransactions')}</Text>
          <TouchableOpacity onPress={() => setPlanningModalVisible(true)}>
            <Text variant="labelMedium" style={[styles.viewAllText, { color: theme.colors.primary }]}>{t('viewAll')}</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          <Chip selected={selectedPeriod === 'today'} onPress={() => setSelectedPeriod('today')} style={styles.filterChip} showSelectedOverlay>{t('today')}</Chip>
          <Chip selected={selectedPeriod === 'week'} onPress={() => setSelectedPeriod('week')} style={styles.filterChip} showSelectedOverlay>{t('week')}</Chip>
          <Chip selected={selectedPeriod === 'month'} onPress={() => setSelectedPeriod('month')} style={styles.filterChip} showSelectedOverlay>{t('month')}</Chip>
        </ScrollView>

        {/* Transactions List */}
        {recentTransactions.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content style={styles.emptyContent}>
              <IconButton icon="receipt" size={48} iconColor={theme.colors.outline} />
              <Text variant="bodyLarge" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>{t('noTransactions')}</Text>
              <Text variant="bodySmall" style={[styles.emptySubtext, { color: theme.colors.outline }]}>{t('addFirst')}</Text>
            </Card.Content>
          </Card>
        ) : (
          recentTransactions.map((tx) => (
            <TouchableOpacity key={tx.id} onPress={() => openActionModal(tx)} activeOpacity={0.7}>
              <Card style={[styles.transactionCard, { backgroundColor: theme.colors.surface }]}>
                <Card.Content style={styles.transactionContent}>
                  <View style={styles.transactionLeft}>
                    <View style={[styles.transactionIcon, { backgroundColor: tx.type === 'receita' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                      <IconButton icon={tx.type === 'receita' ? 'arrow-up' : 'arrow-down'} size={20} iconColor={tx.type === 'receita' ? '#10b981' : '#ef4444'} />
                    </View>
                    <View>
                      <Text variant="titleMedium" style={[styles.transactionTitle, { color: theme.colors.onSurface }]}>{tx.title}</Text>
                      <Text variant="bodySmall" style={[styles.transactionCategory, { color: theme.colors.onSurfaceVariant }]}>{tx.category}</Text>
                    </View>
                  </View>
                  <Text variant="titleMedium" style={[styles.transactionAmount, { color: tx.type === 'receita' ? '#10b981' : '#ef4444' }]}>
                    {tx.type === 'receita' ? '+' : '-'} {formatCurrency(Number(tx.amount || 0), user?.currency)}
                  </Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 40 }} />

        {/* Action Modal */}
        <RNModal visible={actionModalVisible} transparent animationType="none" onRequestClose={closeActionModal}>
          <TouchableWithoutFeedback onPress={closeActionModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <Animated.View style={[styles.actionModal, { backgroundColor: theme.colors.surface, transform: [{ scale: actionModalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
                  <View style={styles.actionModalHeader}>
                    <View style={[styles.actionTypeBadge, { backgroundColor: selectedTransaction?.type === 'receita' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                      <Text style={[styles.actionTypeText, { color: selectedTransaction?.type === 'receita' ? '#10b981' : '#ef4444' }]}>
                        {selectedTransaction?.type === 'receita' ? t('income').toUpperCase() : t('expenses').toUpperCase()}
                      </Text>
                    </View>
                    <IconButton icon="close" size={20} iconColor={theme.colors.outline} onPress={closeActionModal} />
                  </View>
                  <Divider />
                  <View style={styles.actionModalBody}>
                    <Text variant="titleLarge" style={[styles.actionModalTitle, { color: theme.colors.onSurface }]}>{selectedTransaction?.title}</Text>
                    <Text variant="displaySmall" style={[styles.actionModalAmount, { color: selectedTransaction?.type === 'receita' ? '#10b981' : '#ef4444' }]}>
                      {formatCurrency(selectedTransaction?.amount || 0, user?.currency)}
                    </Text>
                    <Text variant="bodyMedium" style={[styles.actionModalCategory, { color: theme.colors.onSurfaceVariant }]}>{t('categoryInput')}: {selectedTransaction?.category}</Text>
                    <Text variant="bodySmall" style={[styles.actionModalDate, { color: theme.colors.outline }]}>{formatDate(selectedTransaction?.date || new Date().toISOString())}</Text>
                  </View>
                  <Divider />
                  <View style={styles.actionModalFooter}>
                    <PaperButton mode="contained" onPress={handleEdit} icon="pencil" style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} labelStyle={styles.actionButtonLabel}>{t('edit')}</PaperButton>
                    <PaperButton mode="outlined" onPress={handleDelete} icon="delete" style={[styles.actionButton, { borderColor: theme.colors.error }]} labelStyle={{ color: theme.colors.error }}>{t('delete')}</PaperButton>
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </RNModal>

        {/* Delete Confirmation Modal */}
        <RNModal visible={deleteModalVisible} transparent animationType="none" onRequestClose={() => setDeleteModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setDeleteModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <Animated.View style={[styles.confirmModal, { backgroundColor: theme.colors.surface, transform: [{ scale: deleteModalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
                  <View style={styles.confirmModalHeader}>
                    <Text variant="titleLarge" style={[styles.confirmTitle, { color: theme.colors.onSurface }]}>{t('confirmTitle')}</Text>
                    <IconButton icon="close" size={20} iconColor={theme.colors.outline} onPress={() => setDeleteModalVisible(false)} />
                  </View>
                  <Divider />
                  <View style={styles.confirmModalBody}>
                    <Text variant="bodyMedium" style={[styles.confirmMessage, { color: theme.colors.onSurfaceVariant }]}>{t('confirmDeleteMsg')}</Text>
                    <View style={[styles.confirmTransactionInfo, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <Text variant="titleMedium" style={[styles.confirmTransactionTitle, { color: theme.colors.onSurface }]}>{selectedTransaction?.title}</Text>
                      <Text variant="bodyLarge" style={[styles.confirmTransactionAmount, { color: selectedTransaction?.type === 'receita' ? '#10b981' : '#ef4444' }]}>
                        {formatCurrency(selectedTransaction?.amount || 0, user?.currency)}
                      </Text>
                    </View>
                  </View>
                  <Divider />
                  <View style={styles.confirmModalFooter}>
                    <PaperButton mode="outlined" onPress={() => setDeleteModalVisible(false)} style={styles.confirmButton}>{t('cancel')}</PaperButton>
                    <PaperButton mode="contained" onPress={confirmDelete} style={[styles.confirmButton, styles.deleteButton]}>{t('delete')}</PaperButton>
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </RNModal>

        {/* PWA Install Prompt Modal */}
        <RNModal visible={pwaModalVisible} transparent animationType="fade" onRequestClose={handleClosePwa}>
          <TouchableWithoutFeedback onPress={handleClosePwa}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.pwaModal, { backgroundColor: theme.colors.surface }]}>
                  {/* Header */}
                  <View style={styles.pwaModalHeader}>
                    <View style={styles.pwaIconContainer}>
                      <IconButton icon="cellphone-arrow-down" size={32} iconColor={theme.colors.primary} />
                    </View>
                    <Text variant="titleLarge" style={[styles.pwaTitle, { color: theme.colors.onSurface }]}>
                      {t('installApp')}
                    </Text>
                    <IconButton icon="close" size={20} iconColor={theme.colors.outline} onPress={handleClosePwa} style={styles.pwaCloseBtn} />
                  </View>

                  <Divider />

                  {isIOS ? (
                    /* Instruções visuais passo a passo para iOS */
                    <View style={styles.pwaIOSSteps}>
                      <Text variant="bodyMedium" style={[styles.pwaStepIntro, { color: theme.colors.onSurfaceVariant }]}>
                        Siga os passos abaixo no Safari:
                      </Text>

                      {/* Passo 1 */}
                      <View style={[styles.pwaStep, { backgroundColor: theme.colors.primaryContainer + '40' }]}>
                        <View style={[styles.pwaStepNumber, { backgroundColor: theme.colors.primary }]}>
                          <Text style={styles.pwaStepNumberText}>1</Text>
                        </View>
                        <View style={styles.pwaStepContent}>
                          <Text variant="bodyLarge" style={[styles.pwaStepTitle, { color: theme.colors.onSurface }]}>
                            Toque no botão Compartilhar
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            É o ícone {'\u2B06'} (seta para cima com quadrado) na barra inferior do Safari
                          </Text>
                        </View>
                        <Text style={styles.pwaStepEmoji}>📤</Text>
                      </View>

                      {/* Passo 2 */}
                      <View style={[styles.pwaStep, { backgroundColor: theme.colors.primaryContainer + '40' }]}>
                        <View style={[styles.pwaStepNumber, { backgroundColor: theme.colors.primary }]}>
                          <Text style={styles.pwaStepNumberText}>2</Text>
                        </View>
                        <View style={styles.pwaStepContent}>
                          <Text variant="bodyLarge" style={[styles.pwaStepTitle, { color: theme.colors.onSurface }]}>
                            Role para baixo no menu
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Procure a opção "Adicionar à Tela de Início"
                          </Text>
                        </View>
                        <Text style={styles.pwaStepEmoji}>👆</Text>
                      </View>

                      {/* Passo 3 */}
                      <View style={[styles.pwaStep, { backgroundColor: theme.colors.primaryContainer + '40' }]}>
                        <View style={[styles.pwaStepNumber, { backgroundColor: theme.colors.primary }]}>
                          <Text style={styles.pwaStepNumberText}>3</Text>
                        </View>
                        <View style={styles.pwaStepContent}>
                          <Text variant="bodyLarge" style={[styles.pwaStepTitle, { color: theme.colors.onSurface }]}>
                            Toque em "Adicionar"
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            O app aparecerá na sua tela inicial como um app nativo!
                          </Text>
                        </View>
                        <Text style={styles.pwaStepEmoji}>✅</Text>
                      </View>
                    </View>
                  ) : (
                    /* Android / Chrome */
                    <View style={styles.confirmModalBody}>
                      <IconButton icon="google-chrome" size={48} iconColor={theme.colors.primary} />
                      <Text variant="bodyMedium" style={[styles.confirmMessage, { color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }]}>
                        {t('installPromptMsg')}
                      </Text>
                    </View>
                  )}

                  <Divider />

                  <View style={styles.confirmModalFooter}>
                    <PaperButton mode="outlined" onPress={handleClosePwa} style={styles.confirmButton}>
                      {t('maybeLater')}
                    </PaperButton>
                    {!isIOS && (
                      <PaperButton 
                        mode="contained" 
                        onPress={() => {
                          const promptEvent = (window as any).deferredPrompt;
                          if (promptEvent) {
                            promptEvent.prompt();
                            promptEvent.userChoice.then((choiceResult: any) => {
                              if (choiceResult.outcome === 'accepted') {
                                console.log('User accepted the PWA install prompt');
                              }
                              (window as any).deferredPrompt = null;
                              handleClosePwa();
                            });
                          } else {
                            Alert.alert(t('installApp'), user?.language === 'en' ? 'The installer is not ready yet or the app is already installed.' : 'O instalador ainda não está pronto ou o aplicativo já foi instalado.');
                          }
                        }} 
                        style={[styles.confirmButton, { backgroundColor: theme.colors.primary }]}
                      >
                        {t('install')}
                      </PaperButton>
                    )}
                    {isIOS && (
                      <PaperButton 
                        mode="contained" 
                        onPress={handleClosePwa} 
                        style={[styles.confirmButton, { backgroundColor: theme.colors.primary }]}
                      >
                        Entendi!
                      </PaperButton>
                    )}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </RNModal>

        {/* Edit Modal */}
        <EditTransactionModal visible={editModalVisible} transaction={selectedTransaction} onClose={() => { setEditModalVisible(false); setSelectedTransaction(null); }} onSave={handleSaveEdit} />

        {/* Planning Modal */}
        <PlanningModal 
          visible={planningModalVisible} 
          onClose={() => setPlanningModalVisible(false)} 
          transactions={transactions} 
          currentBalance={balance} 
          currency={user?.currency || 'BRL'} 
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  welcomeText: { fontSize: 14, letterSpacing: 0.3 },
  userName: { fontWeight: '700', fontSize: 26, marginTop: 2 },
  
  // Weather Card
  weatherCard: { marginBottom: 24, borderRadius: 20, elevation: 2 },
  weatherContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  weatherLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  weatherTemp: { fontWeight: '600', fontSize: 15 },
  weatherFeels: { fontSize: 12, marginTop: 2 },
  weatherTempNumber: { fontWeight: 'bold', fontSize: 28 },
  
  // Stats Cards
  statsContainer: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statsCard: { flex: 1, borderRadius: 20, elevation: 3 },
  statsCardContent: { alignItems: 'center', paddingVertical: 16 },
  statsLabel: { color: '#fff', opacity: 0.9, fontSize: 14, letterSpacing: 0.5, marginBottom: 8 },
  statsValue: { color: '#fff', fontWeight: 'bold', fontSize: 22 },
  
  // Balance Card
  balanceCard: { marginBottom: 28, borderRadius: 24, overflow: 'hidden', elevation: 4 },
  balanceGradient: { padding: 20 },
  balanceContent: { alignItems: 'center' },
  balanceLabel: { color: '#fff', opacity: 0.9, fontSize: 14, letterSpacing: 0.5, marginBottom: 8 },
  balanceAmount: { color: '#fff', fontWeight: 'bold', fontSize: 34, marginBottom: 12 },
  refreshButton: { flexDirection: 'row', alignItems: 'center' },
  balanceUpdateText: { color: '#fff', opacity: 0.8, fontSize: 12, marginLeft: 4 },
  
  // Section Header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontWeight: '700', fontSize: 20 },
  viewAllText: { fontSize: 13, fontWeight: '500' },
  
  // Filters
  filterBar: { flexDirection: 'row', marginBottom: 20 },
  filterChip: { marginRight: 12, borderRadius: 24 },
  
  // Transaction Cards
  transactionCard: { marginBottom: 12, borderRadius: 16, elevation: 1 },
  transactionContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  transactionIcon: { borderRadius: 28, overflow: 'hidden', marginRight: 14 },
  transactionTitle: { fontWeight: '600', fontSize: 16 },
  transactionCategory: { fontSize: 12, marginTop: 2, opacity: 0.7 },
  transactionAmount: { fontWeight: '700', fontSize: 16 },
  
  // Empty State
  emptyCard: { marginTop: 40, borderRadius: 20 },
  emptyContent: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, fontWeight: '500', marginTop: 12 },
  emptySubtext: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  
  // Modal Overlay
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  
  // Action Modal
  actionModal: { width: width * 0.85, maxWidth: 380, borderRadius: 28, overflow: 'hidden', elevation: 5 },
  actionModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  actionTypeBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 24 },
  actionTypeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  actionModalBody: { padding: 24, alignItems: 'center' },
  actionModalTitle: { fontWeight: '600', fontSize: 18, marginBottom: 10, textAlign: 'center' },
  actionModalAmount: { fontWeight: 'bold', fontSize: 32, marginBottom: 12 },
  actionModalCategory: { fontSize: 14, marginBottom: 4 },
  actionModalDate: { fontSize: 12, marginTop: 6 },
  actionModalFooter: { flexDirection: 'row', gap: 12, padding: 18 },
  actionButton: { flex: 1, borderRadius: 14, paddingVertical: 4 },
  actionButtonLabel: { fontWeight: '600', fontSize: 14 },
  
  // Confirm Modal
  confirmModal: { width: width * 0.85, maxWidth: 380, borderRadius: 28, overflow: 'hidden', elevation: 5 },
  confirmModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  confirmTitle: { fontWeight: '700', fontSize: 18 },
  confirmModalBody: { padding: 24, alignItems: 'center' },
  confirmMessage: { fontSize: 15, textAlign: 'center', marginBottom: 20 },
  confirmTransactionInfo: { alignItems: 'center', padding: 16, borderRadius: 16, width: '100%' },
  confirmTransactionTitle: { fontWeight: '600', fontSize: 16, marginBottom: 6 },
  confirmTransactionAmount: { fontWeight: 'bold', fontSize: 20 },
  confirmModalFooter: { flexDirection: 'row', gap: 12, padding: 18 },
  confirmButton: { flex: 1, borderRadius: 14, paddingVertical: 4 },
  deleteButton: { backgroundColor: '#ef4444' },
  responsiveWrapper: {
    maxWidth: Platform.OS === 'web' ? 600 : '100%',
    width: '100%',
    alignSelf: 'center',
  },

  // PWA Modal
  pwaModal: { width: width * 0.9, maxWidth: 400, borderRadius: 28, overflow: 'hidden', elevation: 5 },
  pwaModalHeader: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 8 },
  pwaIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(99,102,241,0.1)', justifyContent: 'center', alignItems: 'center' },
  pwaTitle: { fontWeight: '700', fontSize: 18, flex: 1 },
  pwaCloseBtn: { margin: 0 },
  pwaIOSSteps: { padding: 20, gap: 12 },
  pwaStepIntro: { fontSize: 14, marginBottom: 4, textAlign: 'center' },
  pwaStep: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, gap: 12 },
  pwaStepNumber: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  pwaStepNumberText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pwaStepContent: { flex: 1 },
  pwaStepTitle: { fontWeight: '600', fontSize: 15, marginBottom: 2 },
  pwaStepEmoji: { fontSize: 24 },
});