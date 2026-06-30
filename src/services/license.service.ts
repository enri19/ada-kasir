export const LicenseService = {
  async checkLicense(): Promise<{ status: string; expiryDate: string | null }> {
    console.log('License service: checkLicense - not implemented yet');
    return { status: 'none', expiryDate: null };
  },

  async activateLicense(licenseKey: string): Promise<boolean> {
    console.log('License service: activateLicense - not implemented yet', licenseKey);
    return false;
  },
};
