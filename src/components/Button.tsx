import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../config/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return colors.surfaceContainerHigh;
    switch (variant) {
      case 'primary': return colors.primary;
      case 'secondary': return colors.secondary;
      case 'outline': return 'transparent';
      case 'danger': return colors.error;
      default: return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.onSurfaceVariant;
    switch (variant) {
      case 'outline': return colors.primary;
      default: return colors.onPrimary;
    }
  };

  const getBorderColor = () => {
    if (disabled) return colors.surfaceContainerHigh;
    switch (variant) {
      case 'outline': return colors.primary;
      default: return 'transparent';
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm': return 36;
      case 'lg': return spacing.touchTargetMin;
      default: return 44;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          height: getHeight(),
          width: fullWidth ? '100%' : 'auto',
        },
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.stackMd,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.bodyLg,
    fontWeight: '600',
  },
});
