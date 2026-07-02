import React, { useState, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/theme';
import { AppModal } from './ui/AppModal';

interface PickImageOptions {
  aspect?: [number, number];
  quality?: number;
  allowsEditing?: boolean;
}

export function usePickImage() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('Pilih Foto');
  const [showReadOnly, setShowReadOnly] = useState(false);
  const [readOnlyMsg, setReadOnlyMsg] = useState('');
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

  const handleReadOnly = useCallback((msg: string) => {
    setReadOnlyMsg(msg);
    setShowReadOnly(true);
  }, []);

  const modal = (
    <>
      {/* Pilih Foto Modal */}
      <AppModal
        visible={visible}
        onClose={handleCancel}
        type="info"
        title={title}
        message="Pilih sumber foto."
        actions={[
          {
            label: 'Ambil Foto',
            onPress: () => handleSelect('camera'),
            variant: 'primary',
            icon: <Ionicons name="camera-outline" size={16} color="#fff" />,
          },
          {
            label: 'Pilih dari Galeri',
            onPress: () => handleSelect('gallery'),
            variant: 'outline',
            icon: <Ionicons name="images-outline" size={16} color={colors.primary} />,
          },
          {
            label: 'Batal',
            onPress: handleCancel,
            variant: 'outline',
          },
        ]}
      />

      {/* Read-only warning */}
      <AppModal
        visible={showReadOnly}
        onClose={() => setShowReadOnly(false)}
        type="warning"
        title="Mode Read-only"
        icon="lock-closed"
        message={readOnlyMsg}
        primaryAction={{
          label: 'Mengerti',
          onPress: () => setShowReadOnly(false),
          variant: 'primary',
        }}
      />
    </>
  );

  return { pickImage, modal, handleReadOnly };
}
