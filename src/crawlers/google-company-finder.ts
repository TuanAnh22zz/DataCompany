import { chromium, Browser, Page } from 'playwright';
import { Logger } from '../utils/logger';
import { randomDelay } from '../utils/delay';
import type { Company } from '../types';

export class GoogleCompanyFinder {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize() {
    Logger.info('🚀 Khởi động browser để search Google...');

    this.browser = await chromium.launch({
      headless: false, // debug trước, sau có thể đổi true
    });

    this.page = await this.browser.newPage({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
    });

    Logger.success('✅ Browser Google sẵn sàng');
  }

  async findCompanies(
    industry: string,
    location: string = 'Vietnam',
    maxResults: number = 20
  ): Promise<Company[]> {
    if (!this.page) {
      throw new Error('Browser chưa được khởi tạo. Gọi initialize() trước!');
    }

    Logger.info(`🔍 Đang tìm công ty ngành ${industry} tại ${location}...`);

    const queries = this.buildSearchQueries(industry, location);
    const allCompanies: Company[] = [];

    for (const query of queries) {
      Logger.info(`➡️ Search query: ${query}`);

      const results = await this.searchGoogle(query);
      allCompanies.push(...results);

      Logger.success(`Tìm thấy ${results.length} công ty với query: "${query}"`);

      if (allCompanies.length >= maxResults) break;

      await randomDelay(2000, 4000);
    }

    const uniqueCompanies = this.removeDuplicates(allCompanies).slice(0, maxResults);

    Logger.success(`✅ Tổng cộng: ${uniqueCompanies.length} công ty duy nhất`);
    return uniqueCompanies;
  }

  private buildSearchQueries(industry: string, location: string): string[] {
    return [
      `site:linkedin.com/company ${industry} ${location}`,
      `site:linkedin.com/company consumer goods ${location}`,
      `site:linkedin.com/company food beverage ${location}`,
      `${industry} companies in ${location} linkedin`,
      `top ${industry} companies in ${location}`,
    ];
  }

  private async searchGoogle(query: string): Promise<Company[]> {
    if (!this.page) return [];

    try {
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      await randomDelay(2000, 3000);

      // Nếu có captcha / consent thì bạn sẽ thấy browser mở ra để tự xử lý
      const companies = await this.page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        const results: { name: string; linkedinUrl: string }[] = [];

        for (const a of anchors) {
          const href = a.getAttribute('href') || '';
          const text = a.textContent?.trim() || '';

          // Google result thường có href dạng /url?q=https://linkedin.com/company/...
          if (href.includes('linkedin.com/company') || href.includes('/url?q=https://')) {
            let cleanUrl = href;

            if (href.startsWith('/url?q=')) {
              cleanUrl = href.replace('/url?q=', '').split('&')[0];
            }

            if (cleanUrl.includes('linkedin.com/company')) {
              results.push({
                name: text || cleanUrl,
                linkedinUrl: cleanUrl,
              });
            }
          }
        }

        return results;
      });

      return companies.map((item) => ({
        name: this.cleanCompanyName(item.name),
        linkedinUrl: item.linkedinUrl,
        industry: '',
        createdAt: new Date(),
      }));
    } catch (error) {
      Logger.error(`Lỗi khi search Google với query: ${query}`, error);
      return [];
    }
  }

  private cleanCompanyName(name: string): string {
    return name
      .replace(/\s*-\s*LinkedIn.*$/i, '')
      .replace(/\|.*$/i, '')
      .trim();
  }

  private removeDuplicates(companies: Company[]): Company[] {
    const seen = new Set<string>();

    return companies.filter((company) => {
      const key = company.linkedinUrl || company.name.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      Logger.info('🔴 Đã đóng browser Google');
    }
  }
}