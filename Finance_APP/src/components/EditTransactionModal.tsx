import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, useTheme, IconButton, ActivityIndicator } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

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

// Função para formatar número para exibição (mantém os zeros corretamente)
const formatAmountForDisplay = (amount: number): string => {
  // Garante que o valor seja tratado como número com 2 casas decimais
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Função para converter string digitada para número (preserva os centavos)
const parseInputToNumber = (input: string): number => {
  // Remove tudo que não for número ou vírgula
  let cleaned = input.replace(/[^0-9,]/g, '');
  
  // Substitui vírgula por ponto para conversão
  cleaned = cleaned.replace(',', '.');
  
  // Converte para número
  let number = parseFloat(cleaned);
  
  // Se for inválido, retorna 0
  if (isNaN(number)) return 0;
  
  return number;
};

export default function EditTransactionModal({ visible, transaction, onClose, onSave }: EditTransactionModalProps) {
  const theme = useTheme();
  const [type, setType] = useState<'receita' | 'despesa'>('despesa');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (transaction && visible) {
      setType(transaction.type);
      setTitle(transaction.title);
      // CORREÇÃO: Usa o valor numérico diretamente sem conversão errada
      const formattedAmount = formatAmountForDisplay(transaction.amount);
      setAmount(formattedAmount);
      setCategory(transaction.category);
      setDate(transaction.date.split('T')[0]);
    }
  }, [transaction, visible]);

  const handleAmountChange = (text: string) => {
    // Permite apenas números e vírgula
    const cleaned = text.replace(/[^0-9,]/g, '');
    
    // Impede múltiplas vírgulas
    const commaCount = (cleaned.match(/,/g) || []).length;
    if (commaCount > 1) return;
    
    setAmount(cleaned);
  };

  const handleSave = async () => {
    if (!transaction) return;
    
    if (!title.trim()) {
      alert('Digite um título');
      return;
    }
    
    // CORREÇÃO: Converte o valor corretamente
    const numericAmount = parseInputToNumber(amount);
    
    if (numericAmount === 0) {
      alert('Digite um valor válido');
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await onSave(transaction.id, {
        type,
        title: title.trim(),
        amount: numericAmount,
        category: type === 'despesa' ? category.trim() : 'Receita',
        date: new Date(date).toISOString(),
      });
      onClose();
    } catch (error) {
      alert('Erro ao salvar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const expenseCategories = [
    'Alimentação', 'Transporte', 'Compras', 'Contas', 'Saúde', 'Educação', 'Lazer', 'Outros'
  ];

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
              Editar Transação
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
                onValueChange={(value) => setType(value as 'receita' | 'despesa')}
                buttons={[
                  { value: 'despesa', label: 'Despesa', style: { backgroundColor: type === 'despesa' ? '#ef4444' : undefined } },
                  { value: 'receita', label: 'Receita', style: { backgroundColor: type === 'receita' ? '#10b981' : undefined } }
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
                left={<TextInput.Icon icon="format-title" />}
              />
            </View>

            {/* Valor - CORRIGIDO */}
            <View style={styles.fieldContainer}>
              <TextInput
                label="Valor (R$)"
                value={amount}
                onChangeText={handleAmountChange}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
                left={<TextInput.Icon icon="currency-brl" />}
                placeholder="0,00"
              />
            </View>

            {/* Categoria (apenas para despesas) */}
            {type === 'despesa' && (
              <View style={styles.fieldContainer}>
                <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant, marginBottom: 8 }]}>
                  Categoria
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoriesScroll}
                  contentContainerStyle={styles.categoriesContainer}
                >
                  {expenseCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: category === cat ? theme.colors.primary : theme.colors.surfaceVariant,
                          borderColor: theme.colors.outline,
                        }
                      ]}
                    >
                      <Text variant="labelSmall" style={{ color: category === cat ? '#fff' : theme.colors.onSurface }}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput
                  label="Ou digite a categoria"
                  value={category}
                  onChangeText={setCategory}
                  mode="outlined"
                  style={[styles.input, { marginTop: 12 }]}
                />
              </View>
            )}

            {/* Data */}
            <View style={styles.fieldContainer}>
              <TextInput
                label="Data (AAAA-MM-DD)"
                value={date}
                onChangeText={setDate}
                mode="outlined"
                placeholder="2024-01-01"
                style={styles.input}
                left={<TextInput.Icon icon="calendar" />}
              />
            </View>

            {/* Botão Salvar */}
            <View style={styles.fieldContainer}>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={isSubmitting}
                disabled={isSubmitting}
                style={styles.saveButton}
                contentStyle={styles.saveButtonContent}
              >
                Salvar Alterações
              </Button>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'transparent',
  },
  sectionLabel: {
    fontWeight: '600',
  },
  categoriesScroll: {
    flexGrow: 0,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingBottom: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 8,
    borderWidth: 1,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 4,
  },
  saveButtonContent: {
    paddingVertical: 6,
  },
});