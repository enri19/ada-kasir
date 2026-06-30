import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../config/theme';

interface CardProps {
  children: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  onPress?: () => void;
  style?: any;
}

export const Card: React.FC<CardProps> = (props) => {
  const { children, padding = 'md', onPress, style } = props;
  const getPadding = () => {
    switch (padding) {
      case 'sm': return spacing.stackSm;
      case 'lg': return spacing.stackLg;
      case 'none': return 0;
      default: return spacing.stackMd;
    }
  };

  return (
    <View
      style={[
        styles.card,
        { padding: getPadding() },
        props.style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
});
