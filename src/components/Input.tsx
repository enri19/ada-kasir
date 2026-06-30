import React from 'react';
import { TextInput, Text, View, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../config/theme';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  multiline?: boolean;
  numberOfLines?: number;
  error?: string;
  editable?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  error,
  editable = true,
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          multiline && styles.multiline,
          error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceVariant}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={editable}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.stackMd,
  },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.stackSm,
  },
  input: {
    ...typography.bodyLg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackSm,
    color: colors.onSurface,
    minHeight: 48,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.stackMd,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceContainer,
    color: colors.onSurfaceVariant,
  },
  error: {
    ...typography.labelSm,
    color: colors.error,
    marginTop: 4,
  },
});
