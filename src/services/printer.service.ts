export const PrinterService = {
  async getAvailablePrinters(): Promise<any[]> {
    console.log('Printer service: getAvailablePrinters - not implemented yet');
    return [];
  },

  async connectPrinter(printerId: string): Promise<boolean> {
    console.log('Printer service: connectPrinter - not implemented yet', printerId);
    return false;
  },

  async printReceipt(receiptText: string): Promise<boolean> {
    console.log('Printer service: printReceipt - not implemented yet');
    return false;
  },

  async testPrint(): Promise<boolean> {
    console.log('Printer service: testPrint - not implemented yet');
    return false;
  },
};
