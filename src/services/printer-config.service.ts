import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrinterConfig, DEFAULT_PRINTER_CONFIG, PrinterSize } from '../types/printer';
import { STORAGE_KEYS } from '../utils/constants';

const STORAGE_KEY = STORAGE_KEYS.PRINTER_CONFIG;

/**
 * PrinterConfigService — menyimpan dan membaca konfigurasi printer
 * dari AsyncStorage agar pengaturan tetap tersimpan antar sesi.
 */
export const PrinterConfigService = {
  /**
   * Simpan konfigurasi printer ke AsyncStorage.
   */
  async save(config: PrinterConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
    }
  },

  /**
   * Baca konfigurasi printer dari AsyncStorage.
   * Jika belum ada, kembalikan DEFAULT_PRINTER_CONFIG.
   */
  async load(): Promise<PrinterConfig> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const parsed = JSON.parse(json) as Partial<PrinterConfig>;
        return {
          ...DEFAULT_PRINTER_CONFIG,
          ...parsed,
        };
      }
    } catch (error) {
    }
    return { ...DEFAULT_PRINTER_CONFIG };
  },

  /**
   * Hapus konfigurasi printer.
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
    }
  },

  /**
   * Update sebagian konfigurasi (misal: ganti ukuran saja).
   */
  async update(partial: Partial<PrinterConfig>): Promise<PrinterConfig> {
    const current = await this.load();
    const updated: PrinterConfig = { ...current, ...partial };
    await this.save(updated);
    return updated;
  },

  /**
   * Ubah ukuran printer dan perbarui lebar karakter otomatis.
   */
  async setPrinterSize(size: PrinterSize): Promise<PrinterConfig> {
    const charWidth = size === '58mm' ? 32 : 48;
    return this.update({ printerSize: size, characterWidth: charWidth });
  },

  /**
   * Simpan printer terakhir yang dipilih.
   */
  async setLastPrinter(name: string, address: string): Promise<PrinterConfig> {
    return this.update({
      printerName: name,
      printerAddress: address,
    });
  },
};
