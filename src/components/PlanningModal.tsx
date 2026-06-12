import React, { useMemo } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native';
import { Text, useTheme, IconButton, Card, Divider } from 'react-native-paper';
import { useTranslation } from '../utils/i18n';
import { Transaction } from '../store/useFinanceStore';
import { LinearGradient } from 'expo-linear-gradient';

interface PlanningModalProps {
  visible: boolean;
  onClose: () => void;
  transactions: Transaction[];
  currentBalance: number;
  currency: string;
}

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

const formatMonthYear = (date: Date, lang: string): string => {
  const locale = lang === 'en' ? 'en-US' : 'pt-BR';
  let formatted = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export default function PlanningModal({ visible, onClose, transactions, currentBalance, currency }: PlanningModalProps) {
  const theme = useTheme();
  const { t, lang } = useTranslation();

  const futureMonths = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filtra transações futuras (meses à frente do atual)
    const futureTxs = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() > currentYear) return true;
      if (txDate.getFullYear() === currentYear && txDate.getMonth() > currentMonth) return true;
      return false;
    });

    // Agrupa por YYYY-MM
    const grouped = futureTxs.reduce((acc, tx) => {
      const txDate = new Date(tx.date);
      const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[key]) {
        acc[key] = { income: 0, expense: 0, date: txDate };
      }
      if (tx.type === 'receita') {
        acc[key].income += Number(tx.amount);
      } else {
        acc[key].expense += Number(tx.amount);
      }
      return acc;
    }, {} as Record<string, { income: number, expense: number, date: Date }>);

    const sortedKeys = Object.keys(grouped).sort();

    let runningBalance = currentBalance;
    
    return sortedKeys.map(key => {
      const data = grouped[key];
      runningBalance = runningBalance + data.income - data.expense;
      
      return {
        key,
        date: data.date,
        income: data.income,
        expense: data.expense,
        projectedBalance: runningBalance
      };
    });

  }, [transactions, currentBalance]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              {t('planning')}
            </Text>
            <IconButton icon="close" size={24} iconColor={theme.colors.outline} onPress={onClose} />
          </View>
          
          <ScrollView 
            showsVerticalScrollIndicator={Platform.OS === 'web'} 
            contentContainerStyle={styles.scrollContent}
          >
            {futureMonths.length === 0 ? (
              <View style={styles.emptyContainer}>
                <IconButton icon="calendar-blank" size={64} iconColor={theme.colors.outline} />
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                  {lang === 'en' ? "No planning data for upcoming months." : "Não há transações ou parcelas futuras lançadas."}
                </Text>
              </View>
            ) : (
              futureMonths.map((month) => (
                <Card key={month.key} style={[styles.monthCard, { backgroundColor: theme.colors.surface }]}>
                  <Card.Content>
                    <Text variant="titleMedium" style={[styles.monthTitle, { color: theme.colors.primary }]}>
                      {formatMonthYear(month.date, lang)}
                    </Text>
                    <Divider style={styles.divider} />
                    
                    <View style={styles.row}>
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{t('expectedIncome')}</Text>
                      <Text variant="titleMedium" style={{ color: '#10b981' }}>
                        + {formatCurrency(month.income, currency)}
                      </Text>
                    </View>
                    
                    <View style={styles.row}>
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{t('expensesToPay')}</Text>
                      <Text variant="titleMedium" style={{ color: '#ef4444' }}>
                        - {formatCurrency(month.expense, currency)}
                      </Text>
                    </View>

                    <LinearGradient
                      colors={[theme.colors.primary + '15', theme.colors.primary + '30']}
                      style={styles.projectedBox}
                    >
                      <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                        {t('projectedBalance').toUpperCase()}
                      </Text>
                      <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                        {formatCurrency(month.projectedBalance, currency)}
                      </Text>
                    </LinearGradient>
                  </Card.Content>
                </Card>
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '85%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxWidth: Platform.OS === 'web' ? 600 : '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalTitle: {
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  monthCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
  },
  monthTitle: {
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  divider: {
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectedBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
