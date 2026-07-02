import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Tampilkan pilihan Kamera / Galeri untuk mengambil foto.
 *
 * @param options  Opsi yang diteruskan ke ImagePicker (aspect, quality, dll)
 * @param title    Judul dialog (default: "Pilih Foto")
 * @returns URI hasil atau null jika dibatalkan
 */
export async function pickImageFromSource(
  options: {
    aspect?: [number, number];
    quality?: number;
    allowsEditing?: boolean;
  } = {},
  title = 'Pilih Foto',
): Promise<string | null> {
  const { aspect = [1, 1], quality = 0.7, allowsEditing = true } = options;

  return new Promise((resolve) => {
    Alert.alert(title, 'Ambil foto dari:', [
      {
        text: 'Kamera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses ke kamera.');
            resolve(null);
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing,
            aspect,
            quality,
          });
          if (!result.canceled && result.assets[0]) {
            resolve(result.assets[0].uri);
          } else {
            resolve(null);
          }
        },
      },
      {
        text: 'Galeri',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses ke galeri foto.');
            resolve(null);
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing,
            aspect,
            quality,
          });
          if (!result.canceled && result.assets[0]) {
            resolve(result.assets[0].uri);
          } else {
            resolve(null);
          }
        },
      },
      { text: 'Batal', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}
