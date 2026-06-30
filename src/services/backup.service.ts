export const BackupService = {
  async backupToCloud(): Promise<boolean> {
    console.log('Backup service: backupToCloud - not implemented yet');
    return false;
  },

  async restoreFromCloud(): Promise<boolean> {
    console.log('Backup service: restoreFromCloud - not implemented yet');
    return false;
  },

  async getLastBackupTime(): Promise<string | null> {
    console.log('Backup service: getLastBackupTime - not implemented yet');
    return null;
  },
};
