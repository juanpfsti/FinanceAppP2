import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, Image, View, TouchableOpacity, Animated, KeyboardAvoidingView, Platform, Alert, Linking } from 'react-native';
import { TextInput, Button, SegmentedButtons, Snackbar, useTheme, Text, IconButton, ActivityIndicator } from 'react-native-paper';
import { useFinanceStore } from '../../src/store/useFinanceStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { ViaCepService } from '../../src/services/api';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Funções de formatação
const formatToBRLString = (value: string): string => {
  const numeric = value.replace(/\D/g, '');
  if (numeric === '') return '';
  const number = parseInt(numeric, 10) / 100;
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseCurrencyToNumber = (formatted: string): number => {
  const numeric = formatted.replace(/[^0-9,-]/g, '').replace(',', '.');
  return parseFloat(numeric) || 0;
};

export default function AddTransaction() {
  const { addTransaction } = useFinanceStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [cep, setCep] = useState('');
  const [location, setLocation] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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
    const formatted = formatToBRLString(cleaned);
    setAmount(formatted);
  };

  const fetchAddress = async () => {
    if (cep.length !== 8) {
      Alert.alert('CEP Inválido', 'Digite um CEP válido com 8 dígitos');
      return;
    }

    setIsFetchingCep(true);
    try {
      const data = await ViaCepService.getAddress(cep);
      if (data && !data.erro) {
        const formattedAddress = `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`;
        setLocation(formattedAddress);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Erro', 'CEP não encontrado');
        setLocation('');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao buscar endereço');
    } finally {
      setIsFetchingCep(false);
    }
  };

  // Função para tirar foto - CORRIGIDA
  const takePhoto = async () => {
    setIsPickingImage(true);
    
    try {
      // Solicitar permissão da câmera
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!cameraPermission.granted) {
        Alert.alert(
          'Permissão Necessária',
          'Precisamos da permissão da câmera para tirar fotos dos comprovantes.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir Configurações', onPress: () => Linking.openSettings() }
          ]
        );
        setIsPickingImage(false);
        return;
      }
      
      // Abrir a câmera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });
      
      setIsPickingImage(false);
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Sucesso', 'Foto capturada com sucesso!');
      }
    } catch (error) {
      setIsPickingImage(false);
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível abrir a câmera. Verifique as permissões.');
    }
  };

  // Função para escolher da galeria - CORRIGIDA
  const pickFromGallery = async () => {
    setIsPickingImage(true);
    
    try {
      // Solicitar permissão da galeria
      const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!galleryPermission.granted) {
        Alert.alert(
          'Permissão Necessária',
          'Precisamos da permissão para acessar suas fotos.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir Configurações', onPress: () => Linking.openSettings() }
          ]
        );
        setIsPickingImage(false);
        return;
      }
      
      // Abrir a galeria
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });
      
      setIsPickingImage(false);
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Sucesso', 'Imagem selecionada com sucesso!');
      }
    } catch (error) {
      setIsPickingImage(false);
      console.error('Erro ao acessar galeria:', error);
      Alert.alert('Erro', 'Não foi possível acessar a galeria.');
    }
  };

  // Menu de opções para adicionar imagem
  const handleAddImage = () => {
    Alert.alert(
      'Adicionar Comprovante',
      'Como você quer adicionar o comprovante?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: '📷 Tirar Foto', onPress: takePhoto },
        { text: '🖼️ Escolher da Galeria', onPress: pickFromGallery }
      ],
      { cancelable: true }
    );
  };

  const removeImage = () => {
    setImageUri(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Digite um título');
      return false;
    }
    if (!amount || parseCurrencyToNumber(amount) === 0) {
      Alert.alert('Erro', 'Digite um valor válido');
      return false;
    }
    if (type === 'expense' && !category.trim()) {
      Alert.alert('Erro', 'Selecione uma categoria para a despesa');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await addTransaction({
        userId: user!.id,
        type: type === 'expense' ? 'despesa' : 'receita',
        title: title.trim(),
        amount: parseCurrencyToNumber(amount),
        category: type === 'expense' ? category.trim() : 'Receita',
        date: new Date().toISOString(),
        location: location.trim() || undefined,
        receiptImageUri: imageUri || undefined
      });

      setSnackbarMessage(type === 'expense' ? 'Despesa salva com sucesso' : 'Receita salva com sucesso');
      setVisible(true);
      
      setTitle('');
      setAmount('');
      setCategory('');
      setCep('');
      setLocation('');
      setImageUri(null);
      
      setTimeout(() => router.push('/(tabs)/'), 1500);
    } catch (error) {
      setSnackbarMessage('Erro ao salvar');
      setVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const expenseCategories = [
    { label: 'Alimentação', value: 'food', icon: 'food' },
    { label: 'Transporte', value: 'transport', icon: 'car' },
    { label: 'Compras', value: 'shopping', icon: 'shopping' },
    { label: 'Contas', value: 'bills', icon: 'receipt' },
    { label: 'Saúde', value: 'health', icon: 'medical-bag' },
    { label: 'Educação', value: 'education', icon: 'school' },
    { label: 'Lazer', value: 'entertainment', icon: 'movie' },
    { label: 'Outros', value: 'other', icon: 'dots-horizontal' },
  ];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
              Nova Transação
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Tipo da Transação */}
          <View style={styles.typeSelectorContainer}>
            <Text variant="labelMedium" style={[styles.typeLabel, { color: theme.colors.onSurfaceVariant }]}>
              Tipo de transação
            </Text>
            <SegmentedButtons
              value={type}
              onValueChange={(value) => {
                setType(value as 'expense' | 'income');
                setCategory('');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              buttons={[
                { value: 'expense', label: 'Despesa', style: styles.segmentedButtonLeft },
                { value: 'income', label: 'Receita', style: styles.segmentedButtonRight }
              ]}
              style={styles.segmentedButton}
            />
          </View>

          {/* Campos Comuns */}
          <View style={styles.sectionCard}>
            <Text variant="labelMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
              Informações principais
            </Text>
            
            <TextInput
              label="Título"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="format-title" color={theme.colors.primary} />}
              activeOutlineColor={theme.colors.primary}
            />

            <TextInput
              label="Valor (R$)"
              value={amount}
              onChangeText={handleAmountChange}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              left={<TextInput.Icon icon="currency-brl" color={theme.colors.primary} />}
              activeOutlineColor={theme.colors.primary}
            />
          </View>

          {/* Campos específicos para Despesa */}
          {type === 'expense' && (
            <View style={styles.sectionCard}>
              <Text variant="labelMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                Categoria <Text style={{ color: theme.colors.error }}>(obrigatória)</Text>
              </Text>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.categoriesContainer}
                contentContainerStyle={styles.categoriesContent}
              >
                {expenseCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => { setCategory(cat.label); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: category === cat.label ? theme.colors.primary : theme.colors.surfaceVariant,
                          borderColor: category === cat.label ? theme.colors.primary : theme.colors.outline,
                        }
                      ]}
                    >
                      <IconButton 
                        icon={cat.icon} 
                        size={18} 
                        iconColor={category === cat.label ? '#fff' : theme.colors.primary}
                        style={styles.categoryIcon}
                      />
                      <Text 
                        variant="labelSmall" 
                        style={[
                          styles.categoryLabel, 
                          { color: category === cat.label ? '#fff' : theme.colors.onSurface }
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TextInput
                label="Ou digite sua própria categoria"
                value={category}
                onChangeText={setCategory}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="pencil" color={theme.colors.primary} />}
                activeOutlineColor={theme.colors.primary}
                placeholder="Ex: Investimentos, Pet, etc"
              />
            </View>
          )}

          {/* Seção de Localização */}
          <View style={styles.sectionCard}>
            <Text variant="labelMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
              Localização
            </Text>
            
            <View style={styles.row}>
              <TextInput
                label="CEP (8 dígitos)"
                value={cep}
                onChangeText={setCep}
                onBlur={fetchAddress}
                mode="outlined"
                keyboardType="numeric"
                maxLength={8}
                style={[styles.input, styles.cepInput]}
                left={<TextInput.Icon icon="map-marker" color={theme.colors.primary} />}
                right={isFetchingCep ? <TextInput.Icon icon="loading" /> : undefined}
                activeOutlineColor={theme.colors.primary}
              />
              <Button 
                mode="contained-tonal" 
                onPress={fetchAddress}
                loading={isFetchingCep}
                style={styles.cepButton}
                buttonColor={theme.colors.primaryContainer}
                textColor={theme.colors.primary}
              >
                Buscar
              </Button>
            </View>

            <TextInput
              label="Localização"
              value={location}
              onChangeText={setLocation}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="map-marker-radius" color={theme.colors.primary} />}
              activeOutlineColor={theme.colors.primary}
              placeholder="Endereço completo"
            />
          </View>

          {/* Comprovante - CORRIGIDO */}
          <View style={styles.sectionCard}>
            <Text variant="labelMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
              Comprovante (opcional)
            </Text>
            
            <TouchableOpacity onPress={handleAddImage} activeOpacity={0.7} disabled={isPickingImage}>
              <View style={[styles.imageButtonContainer, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
                {isPickingImage ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <>
                    <IconButton icon="camera" size={28} iconColor={theme.colors.primary} />
                    <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginLeft: 8 }}>
                      Adicionar Comprovante
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            {imageUri && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity onPress={removeImage} style={styles.removeImageButton}>
                  <IconButton icon="close-circle" size={28} iconColor={theme.colors.error} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Botão Salvar */}
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
            loading={isSubmitting}
            disabled={isSubmitting}
            buttonColor={theme.colors.primary}
          >
            {isSubmitting ? 'Salvando...' : (type === 'expense' ? 'Registrar Despesa' : 'Registrar Receita')}
          </Button>

          <Snackbar 
            visible={visible} 
            onDismiss={() => setVisible(false)} 
            duration={2000} 
            action={{ 
              label: 'Fechar', 
              onPress: () => setVisible(false)
            }}
            style={styles.snackbar}
          >
            {snackbarMessage}
          </Snackbar>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
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
    marginBottom: 28,
    marginTop: 4,
  },
  backButton: {
    margin: 0,
  },
  headerTitle: { 
    fontWeight: '700', 
    fontSize: 24,
  },
  typeSelectorContainer: {
    marginBottom: 24,
  },
  typeLabel: {
    marginBottom: 12,
    fontWeight: '600',
    fontSize: 13,
  },
  segmentedButton: {
    backgroundColor: 'transparent',
  },
  segmentedButtonLeft: {
    borderRadius: 12,
  },
  segmentedButtonRight: {
    borderRadius: 12,
  },
  sectionCard: {
    backgroundColor: 'transparent',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  input: { 
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  categoriesContainer: { 
    marginBottom: 16,
  },
  categoriesContent: {
    paddingRight: 16,
  },
  categoryChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 30, 
    marginRight: 12, 
    borderWidth: 1, 
    paddingLeft: 4,
    paddingRight: 14,
    elevation: 0,
  },
  categoryIcon: {
    margin: 0,
    padding: 0,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16,
    gap: 12,
  },
  cepInput: { 
    flex: 1, 
    marginBottom: 0,
  },
  cepButton: { 
    justifyContent: 'center', 
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  imageButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 16,
    marginBottom: 16,
  },
  imagePreviewContainer: { 
    position: 'relative', 
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  imagePreview: { 
    width: '100%', 
    height: 200, 
    borderRadius: 16,
  },
  removeImageButton: { 
    position: 'absolute', 
    top: 8, 
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
  },
  saveButton: { 
    marginTop: 8, 
    marginBottom: 20, 
    borderRadius: 16,
    elevation: 2,
  },
  saveButtonContent: { 
    paddingVertical: 8,
  },
  snackbar: {
    borderRadius: 12,
  },
});