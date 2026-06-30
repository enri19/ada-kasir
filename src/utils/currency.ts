export const formatRupiah = (amount: number): string => {
  if (amount === 0) return 'Rp0';
  const formatted = amount.toLocaleString('id-ID');
  return `Rp${formatted}`;
};

export const formatRupiahShort = (amount: number): string => {
  if (amount >= 1000000) {
    return `Rp${(amount / 1000000).toFixed(1)}jt`;
  }
  if (amount >= 1000) {
    return `Rp${(amount / 1000).toFixed(0)}rb`;
  }
  return `Rp${amount}`;
};

export const parseRupiah = (text: string): number => {
  const cleaned = text.replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
};
