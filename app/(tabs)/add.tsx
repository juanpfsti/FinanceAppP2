import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, Animated, KeyboardAvoidingView, Platform, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { TextInput, Button, SegmentedButtons, Snackbar, useTheme, Text, IconButton, Divider } from 'react-native-paper';
import { useFinanceStore } from '../../src/store/useFinanceStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../../src/utils/i18n';
import DateTimePicker from '@react-native-community/datetimepicker';

// Funções de formatação
const formatToCurrencyString = (value: string, currency: string = 'BRL'): string => {
  const numeric = value.replace(/\D/g, '');
  if (numeric === '') return '';
  const number = parseInt(numeric, 10) / 100;
  const locale = currency === 'USD' ? 'en-US' : 'pt-BR';
  return number.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseCurrencyStringToNumber = (formatted: string, currency: string = 'BRL'): number => {
  if (currency === 'USD') {
    const numeric = formatted.replace(/,/g, '');
    return parseFloat(numeric) || 0;
  } else {
    const numeric = formatted.replace(/\./g, '').replace(',', '.');
    return parseFloat(numeric) || 0;
  }
};

export default function AddTransaction() {
  const { addTransaction } = useFinanceStore();
  const { user, addCustomCategory } = useAuthStore();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [installments, setInstallments] = useState('1');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [visible, setVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados do Modal de Categorias
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCustomCategory, setNewCustomCategory] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned === '') {
      setAmount('');
      return;
    }
    const formatted = formatToCurrencyString(cleaned, user?.currency);
    setAmount(formatted);
  };

  const handleDateChange = (text: string) => {
    // Mantido apenas se necessário para fallback
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length > 2 && cleaned.length <= 4) {
      cleaned = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      cleaned = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setDateStr(cleaned);
  };

  const parseDateStr = (dStr: string) => {
    if (!dStr) return new Date();
    const parts = dStr.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date();
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Por favor, digite um título.');
      return false;
    }
    if (!amount || parseCurrencyStringToNumber(amount, user?.currency) === 0) {
      Alert.alert('Erro', 'Por favor, digite um valor válido.');
      return false;
    }
    if (!category.trim()) {
      Alert.alert('Erro', 'Por favor, selecione uma categoria.');
      return false;
    }
    if (!dateStr || dateStr.length < 10) {
      Alert.alert('Erro', 'Por favor, digite uma data válida no formato DD/MM/AAAA.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const numInstallments = Math.max(1, parseInt(installments, 10) || 1);
      const totalAmount = parseCurrencyStringToNumber(amount, user?.currency);
      const amountPerInstallment = totalAmount / numInstallments;
      const baseDate = parseDateStr(dateStr);
      
      const promises = [];

      for (let i = 0; i < numInstallments; i++) {
        // Incrementa o mês mantendo o dia aproximado
        const txDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate(), baseDate.getHours(), baseDate.getMinutes());
        
        let txTitle = title.trim();
        if (numInstallments > 1) {
          txTitle = `${txTitle} (${t('installments')} ${i + 1}/${numInstallments})`;
        }

        promises.push(
          addTransaction({
            userId: user!.id,
            type: type === 'expense' ? 'despesa' : 'receita',
            title: txTitle,
            amount: amountPerInstallment,
            category: category.trim(),
            date: txDate.toISOString(),
            location: location.trim() || undefined,
          })
        );
      }

      await Promise.all(promises);

      setSnackbarMessage(type === 'expense' ? t('success') : t('success'));
      setVisible(true);
      
      setTitle('');
      setAmount('');
      setInstallments('1');
      setCategory('');
      setLocation('');
      
      setTimeout(() => router.replace('/(tabs)'), 1500);
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      setSnackbarMessage(t('error'));
      setVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeColor = type === 'expense' ? '#ef4444' : '#10b981';

  const getCurrentCategories = () => {
    const defaults = type === 'expense'
      ? [
          { label: 'Alimentação', icon: 'food' },
          { label: 'Transporte', icon: 'car' },
          { label: 'Compras', icon: 'shopping' },
          { label: 'Contas/Boletos', icon: 'receipt' },
          { label: 'Saúde', icon: 'medical-bag' },
          { label: 'Educação', icon: 'school' },
          { label: 'Lazer', icon: 'movie' },
          { label: 'Outros', icon: 'dots-horizontal' },
        ]
      : [
          { label: 'Salário', icon: 'cash-multiple' },
          { label: 'Freelance/Serviços', icon: 'briefcase' },
          { label: 'Investimentos', icon: 'trending-up' },
          { label: 'Presente/Prêmio', icon: 'gift' },
          { label: 'Outros', icon: 'dots-horizontal' },
        ];

    const custom = (user?.customCategories || []).map((catName) => ({
      label: catName,
      icon: 'tag',
    }));

    return [...defaults, ...custom];
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.responsiveWrapper}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            {/* Cabeçalho */}
            <View style={styles.header}>
              <IconButton 
                icon="arrow-left" 
                size={24} 
                iconColor={theme.colors.primary} 
                onPress={() => router.back()} 
                style={styles.backButton}
              />
              <Text variant="headlineMedium" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                Novo Lançamento
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Seletor Despesa / Receita */}
            <View style={styles.typeSelectorContainer}>
              <SegmentedButtons
                value={type}
                onValueChange={(value) => {
                  setType(value as 'expense' | 'income');
                  setCategory('');
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                buttons={[
                  { value: 'expense', label: 'Despesa' },
                  { value: 'income', label: 'Receita' }
                ]}
                style={styles.segmentedButton}
              />
            </View>

            {/* Formulário Principal */}
            <View style={[styles.formCard, { 
              backgroundColor: type === 'expense' ? 'rgba(239,68,68,0.04)' : 'rgba(16,185,129,0.04)',
              borderColor: type === 'expense' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
              borderWidth: 1,
              borderRadius: 20,
              padding: 16
            }]}>
              <TextInput
                label="Título"
                value={title}
                onChangeText={setTitle}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="format-title" color={activeColor} />}
                activeOutlineColor={activeColor}
                outlineColor={theme.colors.outline + '80'}
                placeholder="Ex: Supermercado, Salário, etc"
              />

              <TextInput
                label={user?.currency === 'USD' ? "Valor ($)" : "Valor (R$)"}
                value={amount}
                onChangeText={handleAmountChange}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                left={<TextInput.Icon icon={user?.currency === 'USD' ? "currency-usd" : "currency-brl"} color={activeColor} />}
                activeOutlineColor={activeColor}
                outlineColor={theme.colors.outline + '80'}
                placeholder={user?.currency === 'USD' ? "0.00" : "0,00"}
              />

              <View style={{ position: 'relative', marginBottom: 16 }}>
                <TextInput
                  label="Data (1ª parcela)"
                  value={dateStr}
                  onChangeText={handleDateChange}
                  mode="outlined"
                  style={{ backgroundColor: 'transparent' }}
                  left={
                    <TextInput.Icon 
                      icon="calendar" 
                      color={activeColor} 
                      onPress={() => { if (Platform.OS !== 'web') setShowDatePicker(true); }} 
                    />
                  }
                  activeOutlineColor={activeColor}
                  outlineColor={theme.colors.outline + '80'}
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                />
                
                {Platform.OS === 'web' && (
                  <input
                    type="date"
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 8,
                      width: 44,
                      height: 44,
                      opacity: 0,
                      cursor: 'pointer',
                      zIndex: 10
                    }}
                    onChange={(e: any) => {
                      if (e.target.value) {
                        const [y, m, d] = e.target.value.split('-');
                        setDateStr(`${d}/${m}/${y}`);
                      }
                    }}
                  />
                )}
              </View>

              {showDatePicker && Platform.OS !== 'web' && (
                <DateTimePicker
                  value={dateStr ? parseDateStr(dateStr) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event: any, selectedDate?: Date) => {
                    setShowDatePicker(false);
                    if (event.type === 'set' && selectedDate) {
                      setDateStr(`${String(selectedDate.getDate()).padStart(2, '0')}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${selectedDate.getFullYear()}`);
                    }
                  }}
                />
              )}

              <TextInput
                label={t('installments') + " (1 a 12)"}
                value={installments}
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, '');
                  if (cleaned === '' || (parseInt(cleaned) >= 1 && parseInt(cleaned) <= 12)) {
                    setInstallments(cleaned);
                  }
                }}
                mode="outlined"
                keyboardType="number-pad"
                style={styles.input}
                left={<TextInput.Icon icon="calendar-month" color={activeColor} />}
                activeOutlineColor={activeColor}
                outlineColor={theme.colors.outline + '80'}
                placeholder="1"
              />

              {/* Combobox de Categoria */}
              <TouchableOpacity onPress={() => setCategoryModalVisible(true)} activeOpacity={0.75}>
                <View style={[styles.dropdownTrigger, { borderColor: theme.colors.outline + '80' }]}>
                  <IconButton icon="tag-outline" size={24} iconColor={activeColor} style={styles.dropdownIcon} />
                  <View style={styles.dropdownTextContainer}>
                    <Text style={[styles.dropdownLabel, { color: theme.colors.onSurfaceVariant }]}>Categoria</Text>
                    <Text style={[styles.dropdownValue, { color: category ? theme.colors.onSurface : theme.colors.outline }]}>
                      {category || 'Selecione uma categoria'}
                    </Text>
                  </View>
                  <IconButton icon="chevron-down" size={24} iconColor={theme.colors.outline} style={styles.dropdownArrow} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Botão de Registro */}
            <Button
              mode="contained"
              onPress={handleSave}
              style={[styles.saveButton, { backgroundColor: type === 'expense' ? '#ef4444' : '#10b981' }]}
              contentStyle={styles.saveButtonContent}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : (type === 'expense' ? 'Registrar Despesa' : 'Registrar Receita')}
            </Button>

            <Snackbar 
              visible={visible} 
              onDismiss={() => setVisible(false)} 
              duration={2000} 
              style={styles.snackbar}
            >
              {snackbarMessage}
            </Snackbar>

          </Animated.View>
        </View>
      </ScrollView>

      {/* Modal de Combobox de Categorias */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setCategoryModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge" style={styles.modalTitle}>Selecionar Categoria</Text>
                <IconButton icon="close" size={24} iconColor={theme.colors.outline} onPress={() => setCategoryModalVisible(false)} />
              </View>
              
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {getCurrentCategories().map((cat) => (
                  <TouchableOpacity
                    key={cat.label}
                    onPress={() => {
                      setCategory(cat.label);
                      setCategoryModalVisible(false);
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    style={[
                      styles.categorySelectItem,
                      category === cat.label && { backgroundColor: theme.colors.primary + '15' }
                    ]}
                  >
                    <IconButton icon={cat.icon} size={22} iconColor={category === cat.label ? theme.colors.primary : theme.colors.outline} style={styles.categorySelectItemIcon} />
                    <Text style={[styles.categorySelectItemText, category === cat.label && { color: theme.colors.primary, fontWeight: '700' }]}>
                      {cat.label}
                    </Text>
                    {category === cat.label && (
                      <IconButton icon="check" size={20} iconColor={theme.colors.primary} style={{ marginLeft: 'auto', margin: 0 }} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <Divider style={styles.modalDivider} />
              
              <View style={styles.customCategorySection}>
                <Text variant="labelMedium" style={[styles.customCategoryLabel, { color: theme.colors.onSurfaceVariant }]}>Criar Categoria Personalizada</Text>
                <View style={styles.customCategoryRow}>
                  <TextInput
                    placeholder="Ex: Viagens, Pet, Investimentos"
                    value={newCustomCategory}
                    onChangeText={setNewCustomCategory}
                    mode="outlined"
                    style={styles.customCategoryInput}
                    dense
                  />
                  <Button
                    mode="contained"
                    onPress={async () => {
                      if (!newCustomCategory.trim()) return;
                      await addCustomCategory(newCustomCategory.trim());
                      setCategory(newCustomCategory.trim());
                      setNewCustomCategory('');
                      setCategoryModalVisible(false);
                    }}
                    style={styles.customCategoryButton}
                  >
                    Adicionar
                  </Button>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 20,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20,
    marginTop: 4,
  },
  backButton: {
    margin: 0,
  },
  headerTitle: { 
    fontWeight: '700', 
    fontSize: 22,
  },
  typeSelectorContainer: {
    marginBottom: 20,
  },
  segmentedButton: {
    borderRadius: 14,
  },
  formCard: {
    marginBottom: 24,
  },
  input: { 
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  saveButton: { 
    marginBottom: 30, 
    borderRadius: 16,
    elevation: 2,
  },
  saveButtonContent: { 
    paddingVertical: 10,
  },
  snackbar: {
    borderRadius: 12,
  },
  
  // Custom Select (Dropdown Trigger)
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  dropdownIcon: {
    margin: 0,
  },
  dropdownTextContainer: {
    flex: 1,
    marginLeft: 4,
  },
  dropdownLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  dropdownValue: {
    fontSize: 15,
    marginTop: 1,
  },
  dropdownArrow: {
    margin: 0,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    maxHeight: '75%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontWeight: 'bold',
  },
  modalScroll: {
    maxHeight: 280,
  },
  categorySelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 6,
  },
  categorySelectItemIcon: {
    margin: 0,
    marginRight: 10,
  },
  categorySelectItemText: {
    fontSize: 16,
  },
  modalDivider: {
    marginVertical: 16,
  },
  customCategorySection: {
    width: '100%',
  },
  customCategoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  customCategoryRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  customCategoryInput: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  customCategoryButton: {
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
  },
  responsiveWrapper: {
    maxWidth: Platform.OS === 'web' ? 600 : '100%',
    width: '100%',
    alignSelf: 'center',
  },
});