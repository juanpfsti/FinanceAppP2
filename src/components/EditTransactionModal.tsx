import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Alert } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, useTheme, IconButton, Divider } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../store/useAuthStore';

interface Transaction {
  id: string;
  userId: string;
  type: 'receita' | 'despesa';
  title: string;
  amount: number;
  category: string;
  date: string;
  location?: string;
  receiptImageUri?: string;
}

interface EditTransactionModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (id: string, updatedData: Partial<Transaction>) => Promise<void>;
}

// Função para formatar número para exibição
const formatAmountForDisplay = (amount: number, currency: string = 'BRL'): string => {
  const locale = currency === 'USD' ? 'en-US' : 'pt-BR';
  return amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Função para converter string digitada para número
const parseInputToNumber = (input: string, currency: string = 'BRL'): number => {
  if (currency === 'USD') {
    let cleaned = input.replace(/[^0-9.]/g, '');
    let number = parseFloat(cleaned);
    return isNaN(number) ? 0 : number;
  } else {
    let cleaned = input.replace(/[^0-9,]/g, '').replace(',', '.');
    let number = parseFloat(cleaned);
    return isNaN(number) ? 0 : number;
  }
};

export default function EditTransactionModal({ visible, transaction, onClose, onSave }: EditTransactionModalProps) {
  const theme = useTheme();
  const { user, addCustomCategory } = useAuthStore();

  const [type, setType] = useState<'receita' | 'despesa'>('despesa');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados do Modal de Categoria
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCustomCategory, setNewCustomCategory] = useState('');

  useEffect(() => {
    if (transaction && visible) {
      setType(transaction.type);
      setTitle(transaction.title);
      setAmount(formatAmountForDisplay(transaction.amount, user?.currency));
      setCategory(transaction.category);
      setDate(transaction.date.split('T')[0]);
      setLocation(transaction.location || '');
    }
  }, [transaction, visible, user]);

  const handleAmountChange = (text: string) => {
    const isUSD = user?.currency === 'USD';
    const regex = isUSD ? /[^0-9.]/g : /[^0-9,]/g;
    const separator = isUSD ? '.' : ',';
    
    const cleaned = text.replace(regex, '');
    const count = (cleaned.match(new RegExp(`\\${separator}`, 'g')) || []).length;
    if (count > 1) return;
    setAmount(cleaned);
  };

  const handleSave = async () => {
    if (!transaction) return;
    
    if (!title.trim()) {
      Alert.alert('Erro', 'Por favor, digite um título.');
      return;
    }
    
    const numericAmount = parseInputToNumber(amount, user?.currency);
    if (numericAmount === 0) {
      Alert.alert('Erro', 'Por favor, digite um valor válido.');
      return;
    }

    if (!category.trim()) {
      Alert.alert('Erro', 'Por favor, selecione uma categoria.');
      return;
    }

    setIsSubmitting(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await onSave(transaction.id, {
        type,
        title: title.trim(),
        amount: numericAmount,
        category: category.trim(),
        date: new Date(date).toISOString(),
        location: location.trim() || undefined,
      });
      onClose();
    } catch (error) {
      Alert.alert('Erro', 'Erro ao salvar transação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentCategories = () => {
    const defaults = type === 'despesa'
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

  if (!transaction) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
              Editar Lançamento
            </Text>
            <IconButton icon="close" size={24} iconColor={theme.colors.outline} onPress={onClose} />
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Tipo da Transação */}
            <View style={styles.fieldContainer}>
              <SegmentedButtons
                value={type}
                onValueChange={(value) => {
                  setType(value as 'receita' | 'despesa');
                  setCategory('');
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                buttons={[
                  { value: 'despesa', label: 'Despesa' },
                  { value: 'receita', label: 'Receita' }
                ]}
              />
            </View>

            {/* Título */}
            <View style={styles.fieldContainer}>
              <TextInput
                label="Título"
                value={title}
                onChangeText={setTitle}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="format-title" color={theme.colors.primary} />}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            {/* Valor */}
            <View style={styles.fieldContainer}>
              <TextInput
                label={user?.currency === 'USD' ? "Valor ($)" : "Valor (R$)"}
                value={amount}
                onChangeText={handleAmountChange}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
                left={<TextInput.Icon icon={user?.currency === 'USD' ? "currency-usd" : "currency-brl"} color={theme.colors.primary} />}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            {/* Combobox de Categoria */}
            <View style={styles.fieldContainer}>
              <TouchableOpacity onPress={() => setCategoryModalVisible(true)} activeOpacity={0.75}>
                <View style={[styles.dropdownTrigger, { borderColor: theme.colors.outline + '40' }]}>
                  <IconButton icon="tag-outline" size={24} iconColor={theme.colors.primary} style={styles.dropdownIcon} />
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

            {/* Localização */}
            <View style={styles.fieldContainer}>
              <TextInput
                label="Localização (Opcional)"
                value={location}
                onChangeText={setLocation}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="map-marker-radius" color={theme.colors.primary} />}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            {/* Data */}
            <View style={styles.fieldContainer}>
              <TextInput
                label="Data (AAAA-MM-DD)"
                value={date}
                onChangeText={setDate}
                mode="outlined"
                placeholder="2026-01-01"
                style={styles.input}
                left={<TextInput.Icon icon="calendar" color={theme.colors.primary} />}
                activeOutlineColor={theme.colors.primary}
              />
            </View>

            {/* Botão Salvar */}
            <View style={styles.fieldContainer}>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={isSubmitting}
                disabled={isSubmitting}
                style={[styles.saveButton, { backgroundColor: type === 'despesa' ? '#ef4444' : '#10b981' }]}
                contentStyle={styles.saveButtonContent}
              >
                Salvar Alterações
              </Button>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Modal Interno de Categoria */}
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
            <View style={[styles.innerModalContent, { backgroundColor: theme.colors.surface }]}>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 5,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.25)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'transparent',
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 14,
  },
  saveButtonContent: {
    paddingVertical: 10,
  },

  // Dropdown trigger
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: 'transparent',
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

  // Inner modal category selection
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  innerModalContent: {
    width: '100%',
    maxHeight: '70%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    fontWeight: 'bold',
  },
  modalScroll: {
    maxHeight: 250,
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
});