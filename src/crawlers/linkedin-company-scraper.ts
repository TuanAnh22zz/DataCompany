import { chromium, Browser, Page } from 'playwright';
import { Logger } from '../utils/logger';
import { delay } from '../utils/delay';
import type { Company } from '../types';

export class LinkedInCompanyScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize() {
    Logger.info('🚀 Đang khởi động Playwright browser...');

    this.browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    this.page = await this.browser.newPage({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    Logger.success('✅ Browser đã sẵn sàng!');
  }

  async scrapeCompanyDetails(linkedinUrl: string): Promise<Partial<Company>> {
    if (!this.page) {
      throw new Error('Browser chưa được khởi tạo. Gọi initialize() trước!');
    }

    Logger.info(`📄 Đang crawl: ${linkedinUrl}`);

    try {
      await this.page.goto(linkedinUrl, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      await delay(2000);

      const companyData = await this.page.evaluate(() => {
        const getText = (selector: string): string => {
          const el = document.querySelector(selector);
          return el?.textContent?.trim() || '';
        };

        const websiteEl = document.querySelector(
          'a[data-tracking-control-name="about_website"]'
        ) as HTMLAnchorElement | null;

        return {
          name: getText('h1'),
          industry: getText('.org-top-card-summary__industry'),
          location: getText('.org-top-card-summary__headquarter'),
          website: websiteEl?.href || '',
          employeeCount: getText('.org-top-card-summary__employees'),
        };
      });

      const result: Partial<Company> = {
        name: companyData.name,
        industry: companyData.industry,
        location: companyData.location,
        website: companyData.website,
        employeeCount: this.parseEmployeeCount(companyData.employeeCount),
      };

      Logger.success(`✅ Crawl thành công: ${companyData.name}`);
      return result;
    } catch (error) {
      Logger.error(`❌ Lỗi khi crawl ${linkedinUrl}:`, error);
      return {};
    }
  }

  private parseEmployeeCount(text: string): number | undefined {
    if (!text) return undefined;

    const match = text.replace(/,/g, '').match(/\d+/);
    if (!match) return undefined;

    return Number(match[0]);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      Logger.info('🔴 Đã đóng browser');
    }
  }
}