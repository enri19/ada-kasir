import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../config/theme';
import { getSafeFooterPadding } from '../../utils/layout';

type AppFooterActionsProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function AppFooterActions({ children, style }: AppFooterActionsProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: getSafeFooterPadding(insets.bottom),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackMd,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
});