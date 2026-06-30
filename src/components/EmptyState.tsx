import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../config/theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
}) => {
  return (
    <View style={styles.container}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.stackLg * 2,
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.stackMd,
  },
  title: {
    ...typography.headlineMobile,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.stackSm,
  },
  message: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
