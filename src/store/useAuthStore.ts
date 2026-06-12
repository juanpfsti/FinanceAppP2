import { create } from 'zustand';
import { Storage } from '../utils/storage';
import {
  isFirebaseConfigured,
  observeFirebaseSession,
  signInFirebaseUser,
  signOutFirebaseUser,
  signUpFirebaseUser,
} from '../services/firebase';

export type Role = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  signUp: (email: string, pass: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  login: async (email, pass) => {
    if (isFirebaseConfigured) {
      try {
        const profile = await signInFirebaseUser(email, pass);
        if (profile) {
          set({ user: profile as User, isLoading: false });
          return true;
        }
      } catch (error) {
        console.error('Erro ao autenticar no Firebase', error);
      }
      return false;
    }

    let loggedUser: User | null = null;
    
    // Seeders de validação mockada
    if (email === 'admin@demo.com' && pass === 'Admin123') {
      loggedUser = { id: '1', email, name: 'Administrador', role: 'admin' };
    } else if (email === 'user@demo.com' && pass === 'User123') {
      loggedUser = { id: '2', email, name: 'Usuário Padrão', role: 'user' };
    }

    if (loggedUser) {
      await Storage.setItem('@session', JSON.stringify(loggedUser));
      set({ user: loggedUser });
      return true;
    }
    return false;
  },

  signUp: async (email, pass, name) => {
    if (isFirebaseConfigured) {
      try {
        const profile = await signUpFirebaseUser(email, pass, name);
        if (profile) {
          set({ user: profile as User, isLoading: false });
          return true;
        }
      } catch (error) {
        console.error('Erro ao cadastrar no Firebase', error);
        throw error;
      }
      return false;
    }

    const mockUser: User = { id: Date.now().toString(), email, name, role: 'user' };
    await Storage.setItem('@session', JSON.stringify(mockUser));
    set({ user: mockUser });
    return true;
  },

  logout: async () => {
    if (isFirebaseConfigured) {
      await signOutFirebaseUser();
    }

    await Storage.removeItem('@session');
    set({ user: null });
  },

  checkSession: async () => {
    if (isFirebaseConfigured) {
      await new Promise<void>((resolve) => {
        let unsubscribe: (() => void) | null = null;

        unsubscribe = observeFirebaseSession(
          (firebaseUser) => {
            set({ user: firebaseUser as User | null });
          },
          () => {
            set({ isLoading: false });
            unsubscribe?.();
            resolve();
          },
        );

        if (!unsubscribe) {
          set({ isLoading: false });
          resolve();
        }
      });
      return;
    }

    try {
      const session = await Storage.getItem('@session');
      if (session) {
        set({ user: JSON.parse(session) });
      }
    } catch (e) {
      console.error('Erro ao recuperar sessão', e);
    } finally {
      set({ isLoading: false });
    }
  }
}));