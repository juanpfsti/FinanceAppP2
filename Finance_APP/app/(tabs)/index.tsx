import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, TouchableOpacity, Modal as RNModal, TouchableWithoutFeedback, Dimensions, Animated, Alert } from 'react-native';
import { Text, Card, useTheme, IconButton, Chip, ActivityIndicator, Button as PaperButton, Divider } from 'react-native-paper';
import { useFinanceStore } from '../../src/store/useFinanceStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import * as Location from 'expo-location';
import { WeatherService } from '../../src/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditTransactionModal from '../../src/components/EditTransactionModal';

const { width } = Dimensions.get('window');

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
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
  
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [weather, setWeather] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({});
      const weatherData = await WeatherService.getWeather(location.coords.latitude, location.coords.longitude);
      if (weatherData?.weather) setWeather(weatherData);
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
      showsVerticalScrollIndicator={false}
    >
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View>
          <Text variant="bodyMedium" style={[styles.welcomeText, { color: theme.colors.onSurfaceVariant }]}>
            Bem-vindo de volta
          </Text>
          <Text variant="headlineMedium" style={[styles.userName, { color: theme.colors.onSurface }]}>
            {user?.name?.split(' ')[0] || 'Usuário'}
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
            <Text variant="bodyMedium" style={styles.statsLabel}>Receitas</Text>
            <Text variant="headlineMedium" style={styles.statsValue}>{formatCurrency(totalIncome)}</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statsCard, { backgroundColor: '#ef4444' }]}>
          <Card.Content style={styles.statsCardContent}>
            <Text variant="bodyMedium" style={styles.statsLabel}>Despesas</Text>
            <Text variant="headlineMedium" style={styles.statsValue}>{formatCurrency(totalExpenses)}</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Balance Card */}
      <Card style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}>
        <LinearGradient colors={[theme.colors.primary, theme.colors.primary + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceGradient}>
          <Card.Content style={styles.balanceContent}>
            <Text variant="bodyMedium" style={styles.balanceLabel}>Saldo Atual</Text>
            <Text variant="displaySmall" style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <IconButton icon="refresh" size={20} iconColor="#fff" />
              <Text variant="bodySmall" style={styles.balanceUpdateText}>Atualizado agora</Text>
            </TouchableOpacity>
          </Card.Content>
        </LinearGradient>
      </Card>

      {/* Transactions Section */}
      <View style={styles.sectionHeader}>
        <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Últimas Transações</Text>
        <TouchableOpacity>
          <Text variant="labelMedium" style={[styles.viewAllText, { color: theme.colors.primary }]}>Ver todas →</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
        <Chip selected={selectedPeriod === 'today'} onPress={() => setSelectedPeriod('today')} style={styles.filterChip} showSelectedOverlay>Hoje</Chip>
        <Chip selected={selectedPeriod === 'week'} onPress={() => setSelectedPeriod('week')} style={styles.filterChip} showSelectedOverlay>Esta Semana</Chip>
        <Chip selected={selectedPeriod === 'month'} onPress={() => setSelectedPeriod('month')} style={styles.filterChip} showSelectedOverlay>Este Mês</Chip>
      </ScrollView>

      {/* Transactions List */}
      {recentTransactions.length === 0 ? (
        <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content style={styles.emptyContent}>
            <IconButton icon="receipt" size={48} iconColor={theme.colors.outline} />
            <Text variant="bodyLarge" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>Nenhuma transação encontrada</Text>
            <Text variant="bodySmall" style={[styles.emptySubtext, { color: theme.colors.outline }]}>Adicione sua primeira transação clicando em "Novo"</Text>
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
                  {tx.type === 'receita' ? '+' : '-'} {formatCurrency(Number(tx.amount || 0))}
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
                      {selectedTransaction?.type === 'receita' ? 'RECEITA' : 'DESPESA'}
                    </Text>
                  </View>
                  <IconButton icon="close" size={20} iconColor={theme.colors.outline} onPress={closeActionModal} />
                </View>
                <Divider />
                <View style={styles.actionModalBody}>
                  <Text variant="titleLarge" style={[styles.actionModalTitle, { color: theme.colors.onSurface }]}>{selectedTransaction?.title}</Text>
                  <Text variant="displaySmall" style={[styles.actionModalAmount, { color: selectedTransaction?.type === 'receita' ? '#10b981' : '#ef4444' }]}>
                    {formatCurrency(selectedTransaction?.amount || 0)}
                  </Text>
                  {selectedTransaction?.type === 'despesa' && (
                    <Text variant="bodyMedium" style={[styles.actionModalCategory, { color: theme.colors.onSurfaceVariant }]}>Categoria: {selectedTransaction?.category}</Text>
                  )}
                  <Text variant="bodySmall" style={[styles.actionModalDate, { color: theme.colors.outline }]}>{formatDate(selectedTransaction?.date || new Date().toISOString())}</Text>
                </View>
                <Divider />
                <View style={styles.actionModalFooter}>
                  <PaperButton mode="contained" onPress={handleEdit} icon="pencil" style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} labelStyle={styles.actionButtonLabel}>Editar</PaperButton>
                  <PaperButton mode="outlined" onPress={handleDelete} icon="delete" style={[styles.actionButton, { borderColor: theme.colors.error }]} labelStyle={{ color: theme.colors.error }}>Excluir</PaperButton>
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
                  <Text variant="titleLarge" style={[styles.confirmTitle, { color: theme.colors.onSurface }]}>Confirmar Exclusão</Text>
                  <IconButton icon="close" size={20} iconColor={theme.colors.outline} onPress={() => setDeleteModalVisible(false)} />
                </View>
                <Divider />
                <View style={styles.confirmModalBody}>
                  <Text variant="bodyMedium" style={[styles.confirmMessage, { color: theme.colors.onSurfaceVariant }]}>Tem certeza que deseja excluir este lançamento?</Text>
                  <View style={[styles.confirmTransactionInfo, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text variant="titleMedium" style={[styles.confirmTransactionTitle, { color: theme.colors.onSurface }]}>{selectedTransaction?.title}</Text>
                    <Text variant="bodyLarge" style={[styles.confirmTransactionAmount, { color: selectedTransaction?.type === 'receita' ? '#10b981' : '#ef4444' }]}>
                      {formatCurrency(selectedTransaction?.amount || 0)}
                    </Text>
                  </View>
                </View>
                <Divider />
                <View style={styles.confirmModalFooter}>
                  <PaperButton mode="outlined" onPress={() => setDeleteModalVisible(false)} style={styles.confirmButton}>Cancelar</PaperButton>
                  <PaperButton mode="contained" onPress={confirmDelete} style={[styles.confirmButton, styles.deleteButton]}>Excluir</PaperButton>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>

      {/* Edit Modal */}
      <EditTransactionModal visible={editModalVisible} transaction={selectedTransaction} onClose={() => { setEditModalVisible(false); setSelectedTransaction(null); }} onSave={handleSaveEdit} />
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
});