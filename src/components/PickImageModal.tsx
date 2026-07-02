import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../config/theme';

interface PickImageOptions {
  aspect?: [number, number];
  quality?: number;
  allowsEditing?: boolean;
}

export function usePickImage() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('Pilih Foto');
  const optionsRef = useRef<PickImageOptions>({});
  const resolveRef = useRef<((value: string | null) => void) | null>(null);

  const pickImage = useCallback(
    (opts: PickImageOptions = {}, ttl = 'Pilih Foto'): Promise<string | null> => {
      optionsRef.current = { aspect: [1, 1], quality: 0.7, allowsEditing: true, ...opts };
      setTitle(ttl);
      setVisible(true);
      return new Promise((res) => {
        resolveRef.current = res;
      });
    },
    [],
  );

  const handleSelect = useCallback(async (source: 'camera' | 'gallery') => {
    setVisible(false);
    const resolve = resolveRef.current;
    resolveRef.current = null;
    const { aspect, quality, allowsEditing } = optionsRef.current;
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses ke kamera.');
          resolve?.(null);
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing,
          aspect,
          quality,
        });
        resolve?.(!result.canceled && result.assets[0] ? result.assets[0].uri : null);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses ke galeri foto.');
          resolve?.(null);
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing,
          aspect,
          quality,
        });
        resolve?.(!result.canceled && result.assets[0] ? result.assets[0].uri : null);
      }
    } catch {
      resolve?.(null);
    }
  }, []);

  const handleCancel = useCallback(() => {
    setVisible(false);
    resolveRef.current?.(null);
    resolveRef.current = null;
  }, []);

  const modal = (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.sourceButton} onPress={() => handleSelect('camera')}>
              <Ionicons name="camera-outline" size={16} color={colors.primary} />
              <Text style={styles.sourceButtonText}>Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sourceButton} onPress={() => handleSelect('gallery')}>
              <Ionicons name="images-outline" size={16} color={colors.primary} />
              <Text style={styles.sourceButtonText}>Galeri</Text>
            </TouchableOpacity>
            <View style={styles.spacer} />
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return { pickImage, modal };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  content: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.stackMd, width: '90%', maxWidth: 360,
  },
  title: {
    ...typography.headlineMobile, fontWeight: '700',
    color: colors.onSurface, marginBottom: spacing.stackMd, textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  sourceButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary,
  },
  sourceButtonText: {
    ...typography.bodyMd, fontWeight: '600', color: colors.primary,
  },
  spacer: { flex: 1 },
  cancelButton: {
    paddingVertical: 10,
  },
  cancelText: {
    ...typography.bodyMd, fontWeight: '600', color: colors.onSurfaceVariant,
  },
});
