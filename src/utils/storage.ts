import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import localforage from 'localforage';

// Configura o localforage para forçar o uso do IndexedDB na Web
if (Platform.OS === 'web') {
  localforage.config({
    name: 'FinanceApp',
    storeName: 'finance_data',
    driver: localforage.INDEXEDDB
  });
}

export const Storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await localforage.setItem(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return (await localforage.getItem<string>(key)) || null;
    } else {
      return await AsyncStorage.getItem(key);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await localforage.removeItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  }
};