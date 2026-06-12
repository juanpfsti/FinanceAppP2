import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Verifica se estamos em um ambiente de browser real (não SSR/Node.js)
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// Inicializa o localforage de forma lazy, apenas quando no browser
let _localforage: typeof import('localforage') | null = null;

const getLocalforage = async () => {
  if (!isBrowser) return null;
  if (_localforage) return _localforage;

  const localforage = await import('localforage');
  const lf = localforage.default || localforage;
  lf.config({
    name: 'FinanceApp',
    storeName: 'finance_data',
    driver: [lf.INDEXEDDB, lf.LOCALSTORAGE],
  });
  _localforage = lf;
  return _localforage;
};

export const Storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      const lf = await getLocalforage();
      if (lf) await lf.setItem(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      const lf = await getLocalforage();
      if (!lf) return null;
      return (await lf.getItem<string>(key)) || null;
    } else {
      return await AsyncStorage.getItem(key);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      const lf = await getLocalforage();
      if (lf) await lf.removeItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  }
};