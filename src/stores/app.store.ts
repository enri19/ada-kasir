import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import { Store } from '../types/store';
import { StoreRepository } from '../database/store.repo';

interface AppState {
  isReady: boolean;
  isOnboardingComplete: boolean;
  activeStore: Store | null;
  setIsOnboardingComplete: (complete: boolean) => void;
  setActiveStore: (store: Store | null) => void;
  loadFromStorage: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  isReady: false,
  isOnboardingComplete: false,
  activeStore: null,

  setIsOnboardingComplete: (complete) => {
    AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, String(complete));
    set({ isOnboardingComplete: complete });
  },

  setActiveStore: (store) => {
    if (store) {
      AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_STORE_ID, store.id);
    } else {
      AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_STORE_ID);
    }
    set({ activeStore: store });
  },

  loadFromStorage: async () => {
    const onboardingComplete = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    const isComplete = onboardingComplete === 'true';
    
    let store: Store | null = null;
    if (isComplete) {
      try {
        store = await StoreRepository.getActiveStore();
      } catch (error) {
        console.error('Error loading store:', error);
      }
    }

    set({
      isReady: true,
      isOnboardingComplete: isComplete,
      activeStore: store,
    });
  },
}));
