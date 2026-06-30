import { ReportRepository } from '../database/report.repo';
import { DailyReport, ReportFilter } from '../types/report';

export const ReportService = {
  async getDailyReport(date: string): Promise<DailyReport> {
    return await ReportRepository.getDailyReport(date);
  },

  async generateExcelReport(filter: ReportFilter): Promise<string | null> {
    console.log('Report service: generateExcelReport - not implemented yet', filter);
    return null;
  },

  async generatePDFReport(filter: ReportFilter): Promise<string | null> {
    console.log('Report service: generatePDFReport - not implemented yet', filter);
    return null;
  },
};
