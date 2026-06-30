import React from 'react';
import { Text } from 'react-native';
import { formatRupiah } from '../utils/currency';

interface CurrencyTextProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  color?: string;
}

export const CurrencyText: React.FC<CurrencyTextProps> = ({
  amount,
  size = 'md',
  color,
}) => {
  const getFontSize = () => {
    switch (size) {
      case 'sm': return 12;
      case 'lg': return 20;
      case 'xl': return 32;
      case 'xxl': return 40;
      default: return 16;
    }
  };

  const getFontWeight = () => {
    switch (size) {
      case 'xl':
      case 'xxl': return '800';
      case 'lg': return '700';
      default: return '600';
    }
  };

  return (
    <Text
      style={{
        fontSize: getFontSize(),
        fontWeight: getFontWeight() as any,
        color: color || '#1a1c1c',
        letterSpacing: size === 'xl' ? -0.02 : 0,
      }}
    >
      {formatRupiah(amount)}
    </Text>
  );
};
