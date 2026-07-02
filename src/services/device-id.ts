import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'ada_kasir_device_id';

/**
 * Menghasilkan UUID v4 sederhana tanpa依赖 Node crypto.
 * Digunakan untuk device ID yang stabil.
 */
function generateUUID(): string {
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4'; // version 4
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 8]; // variant
    } else {
      uuid += hex[(Math.random() * 16) | 0];
    }
  }
  return uuid;
}

/**
 * Mendapatkan atau membuat device ID yang stabil.
 * Device ID disimpan di AsyncStorage dan akan persist
 * selama aplikasi tidak di-uninstall atau data tidak dihapus.
 */
export async function getDeviceId(): Promise<string> {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = generateUUID();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    // Fallback: generate setiap kali (tidak persist)
    return generateUUID();
  }
}

/**
 * Menghapus device ID (misalnya saat reset data).
 */
export async function clearDeviceId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DEVICE_ID_KEY);
  } catch {
    // Ignore
  }
}
