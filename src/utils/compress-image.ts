import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Kompres gambar sebelum disimpan ke database.
 * - Resize ke max 512x512 (mempertahankan aspect ratio)
 * - Kompres ke JPEG quality 0.6
 * - Return URI baru yang sudah dikompres
 */
export async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 512, height: 512 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
