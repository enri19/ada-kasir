import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../config/theme';

interface CustomHeaderProps {
  title: string;
  onBack?: () => void;
}

export function CustomHeader({ title, onBack }: CustomHeaderProps) {
  return (
    <View style={styles.header}>
      {onBack && (
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      {onBack && <View style={{ width: 24 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, paddingVertical: spacing.stackMd,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  headerTitle: { ...typography.headlineMobile, color: colors.primary, fontWeight: '700' },
});
