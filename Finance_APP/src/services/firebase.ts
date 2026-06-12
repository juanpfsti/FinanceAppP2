import { Platform } from 'react-native';
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User as FirebaseAuthUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  type Firestore,
  where,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const isDefined = (value: string | undefined): value is string => Boolean(value && value.trim());

export const isFirebaseConfigured = Object.values(firebaseConfig).every(isDefined);

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;

export const getFirebaseApp = (): FirebaseApp | null => {
  if (!isFirebaseConfigured) return null;
  if (firebaseApp) return firebaseApp;
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return firebaseApp;
};

export const getFirebaseAuth = (): Auth | null => {
  const app = getFirebaseApp();
  if (!app) return null;
  if (firebaseAuth) return firebaseAuth;

  if (Platform.OS === 'web') {
    firebaseAuth = getAuth(app);
    void setPersistence(firebaseAuth, browserLocalPersistence);
    return firebaseAuth;
  }

  const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;

  try {
    firebaseAuth = initializeAuth(app, {
      persistence: getReactNativePersistence ? getReactNativePersistence(AsyncStorage) : undefined,
    });
  } catch {
    firebaseAuth = getAuth(app);
  }

  return firebaseAuth;
};

export const getFirebaseFirestore = (): Firestore | null => {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!firebaseDb) {
    firebaseDb = getFirestore(app);
  }
  return firebaseDb;
};

export type FirebaseUserProfile = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

const defaultProfileFromAuth = (user: FirebaseAuthUser): FirebaseUserProfile => {
  const email = user.email?.toLowerCase() || '';
  const isAdmin = email === 'admin@demo.com';
  const isDemoUser = email === 'user@demo.com';

  return {
    id: user.uid,
    email: user.email || '',
    name: isAdmin ? 'Administrador' : isDemoUser ? 'Usuário Padrão' : user.displayName || user.email?.split('@')[0] || 'Usuário',
    role: isAdmin ? 'admin' : 'user',
  };
};

export const signInFirebaseUser = async (email: string, password: string): Promise<FirebaseUserProfile | null> => {
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();
  if (!auth || !db) return null;

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profileRef = doc(db, 'users', credential.user.uid);
  const profileSnapshot = await getDoc(profileRef);
  const fallbackProfile = defaultProfileFromAuth(credential.user);

  if (!profileSnapshot.exists()) {
    await setDoc(profileRef, {
      ...fallbackProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return fallbackProfile;
  }

  const data = profileSnapshot.data() as Partial<FirebaseUserProfile>;
  return {
    id: credential.user.uid,
    email: data.email || credential.user.email || '',
    name: data.name || fallbackProfile.name,
    role: data.role === 'admin' ? 'admin' : 'user',
  };
};

export const ensureFirebaseUserProfile = async (user: FirebaseAuthUser): Promise<FirebaseUserProfile> => {
  const db = getFirebaseFirestore();
  const fallbackProfile = defaultProfileFromAuth(user);
  if (!db) return fallbackProfile;

  const profileRef = doc(db, 'users', user.uid);
  const profileSnapshot = await getDoc(profileRef);

  if (!profileSnapshot.exists()) {
    await setDoc(profileRef, {
      ...fallbackProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return fallbackProfile;
  }

  const data = profileSnapshot.data() as Partial<FirebaseUserProfile>;
  return {
    id: user.uid,
    email: data.email || user.email || '',
    name: data.name || fallbackProfile.name,
    role: data.role === 'admin' ? 'admin' : 'user',
  };
};

export const observeFirebaseSession = (
  onUser: (user: FirebaseUserProfile | null) => void,
  onReady: () => void,
): (() => void) | null => {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  let unsubscribe = () => undefined;

  unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      onUser(null);
      onReady();
      return;
    }

    const profile = await ensureFirebaseUserProfile(firebaseUser);
    onUser(profile);
    onReady();
  });

  return unsubscribe;
};

export const signOutFirebaseUser = async (): Promise<void> => {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
};

export type StoredTransaction = {
  id: string;
  userId: string;
  type: 'receita' | 'despesa';
  title: string;
  amount: number;
  category: string;
  date: string;
  location?: string;
  receiptImageUri?: string;
  receiptStoragePath?: string;
};

export const firebaseTransactionApi = {
  async listTransactions(userId: string): Promise<StoredTransaction[]> {
    const db = getFirebaseFirestore();
    if (!db) return [];

    const transactionsRef = collection(db, 'transactions');
    const transactionsQuery = query(transactionsRef, where('userId', '==', userId));
    const snapshot = await getDocs(transactionsQuery);

    return snapshot.docs
      .map((transactionDoc) => ({
        id: transactionDoc.id,
        ...(transactionDoc.data() as Omit<StoredTransaction, 'id'>),
      }))
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  },

  async createTransaction(transaction: Omit<StoredTransaction, 'id'>): Promise<StoredTransaction> {
    const db = getFirebaseFirestore();
    if (!db) {
      throw new Error('Firebase Firestore não está configurado');
    }

    const transactionsRef = collection(db, 'transactions');
    const createdDoc = doc(transactionsRef);

    const storedTransaction: StoredTransaction = {
      ...transaction,
      id: createdDoc.id,
    };

    await setDoc(createdDoc, {
      ...storedTransaction,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return storedTransaction;
  },

  async updateTransaction(transactionId: string, updatedData: Partial<StoredTransaction>): Promise<void> {
    const db = getFirebaseFirestore();
    if (!db) {
      throw new Error('Firebase Firestore não está configurado');
    }

    await setDoc(
      doc(db, 'transactions', transactionId),
      {
        ...updatedData,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },

  async deleteTransaction(transaction: StoredTransaction): Promise<void> {
    const db = getFirebaseFirestore();
    if (!db) {
      throw new Error('Firebase Firestore não está configurado');
    }

    await deleteDoc(doc(db, 'transactions', transaction.id));
  },
};