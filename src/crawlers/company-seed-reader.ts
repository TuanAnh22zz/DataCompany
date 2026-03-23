import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Logger } from '../utils/logger';
import type { Company } from '../types';

export class CompanySeedReader {
  async readCompaniesByIndustry(industry: string): Promise<Company[]> {
    const normalizedIndustry = this.normalizeIndustryName(industry);

    const filePath = path.resolve(
      process.cwd(),
      'data/companies/all_companies.csv'
    );

    Logger.info(`📂 Đang đọc file company master: ${filePath}`);
    Logger.info(`🔎 Industry input: ${industry}`);
    Logger.info(`🔎 Normalized industry: ${normalizedIndustry}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Không tìm thấy file dữ liệu công ty: ${filePath}`);
    }

    return new Promise((resolve, reject) => {
      const companies: Company[] = [];
      let totalRows = 0;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: Record<string, string>) => {
          totalRows++;

          const rawIndustry = row.industry || '';
          const rowIndustry = this.normalizeIndustryName(rawIndustry);

          Logger.info(
            `ROW ${totalRows}: name=${row.name}, rawIndustry=${rawIndustry}, normalized=${rowIndustry}`
          );

          if (rowIndustry === normalizedIndustry) {
            companies.push({
              name: row.name || '',
              industry: row.industry || normalizedIndustry,
              location: row.location || '',
              website: row.website || '',
              linkedinUrl: row.linkedinUrl || '',
              createdAt: new Date(),
            });
          }
        })
        .on('end', () => {
          Logger.success(`✅ Tổng số dòng đọc được: ${totalRows}`);
          Logger.success(
            `✅ Đã lọc được ${companies.length} công ty thuộc ngành ${normalizedIndustry}`
          );
          resolve(companies);
        })
        .on('error', (error) => {
          Logger.error('❌ Lỗi đọc CSV:', error);
          reject(error);
        });
    });
  }

  private normalizeIndustryName(industry: string): string {
    const value = industry.toLowerCase().trim();

    const map: Record<string, string> = {
      fmcg: 'fmcg',
      'consumer goods': 'fmcg',

      tech: 'technology',
      it: 'technology',
      software: 'technology',
      technology: 'technology',

      banking: 'banking',
      bank: 'banking',
      finance: 'banking',

      retail: 'retail',

      education: 'education',
      edtech: 'education',

      healthcare: 'healthcare',
      health: 'healthcare',
      medical: 'healthcare',

      'real estate': 'real-estate',
      realestate: 'real-estate',
      property: 'real-estate',
      'real-estate': 'real-estate',

      logistics: 'logistics',

      manufacturing: 'manufacturing',

      ecommerce: 'ecommerce',
      'e-commerce': 'ecommerce',

      insurance: 'insurance',

      hospitality: 'hospitality',

      media: 'media',

      telecom: 'telecommunications',
      telecommunications: 'telecommunications',

      automotive: 'automotive',

      pharma: 'pharmaceutical',
      pharmaceutical: 'pharmaceutical',

      energy: 'energy',

      fnb: 'food-beverage',
      'food beverage': 'food-beverage',
      'food-beverage': 'food-beverage',

      construction: 'construction',
      fashion: 'fashion',
    };

    return map[value] || value.replace(/\s+/g, '-');
  }
}