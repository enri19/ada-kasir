import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';

export type LicenseStatus = 'none' | 'basic' | 'premium';

interface LicenseState {
  status: LicenseStatus;
  expiryDate: string | null;
  loadFromStorage: () => Promise<void>;
  setLicense: (status: LicenseStatus, expiryDate: string | null) => void;
}

export const useLicenseStore = create<LicenseState>((set) => ({
  status: 'none',
  expiryDate: null,

  loadFromStorage: async () => {
    const status = (await AsyncStorage.getItem(STORAGE_KEYS.LICENSE_STATUS)) as LicenseStatus || 'none';
    const expiryDate = await AsyncStorage.getItem('license_expiry_date') || null;
    set({ status, expiryDate });
  },

  setLicense: (status, expiryDate) => {
    AsyncStorage.setItem(STORAGE_KEYS.LICENSE_STATUS, status);
    if (expiryDate) {
      AsyncStorage.setItem('license_expiry_date', expiryDate);
    } else {
      AsyncStorage.removeItem('license_expiry_date');
    }
    set({ status, expiryDate });
  },
}));
