export const generateInvoiceNumber = (transactionCount: number): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const sequence = String(transactionCount + 1).padStart(3, '0');
  return `INV-${year}${month}${day}-${sequence}`;
};

export const getInvoiceDate = (invoiceNumber: string): string => {
  const parts = invoiceNumber.split('-');
  if (parts.length === 3) {
    const dateStr = parts[1];
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
  }
  return invoiceNumber;
};
