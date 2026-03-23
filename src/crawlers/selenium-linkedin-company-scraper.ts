import { Builder, By, until, WebDriver } from 'selenium-webdriver';
const chrome = require('selenium-webdriver/chrome');
import { Logger } from '../utils/logger';

export interface LinkedinCompanyPublicInfo {
  name?: string;
  website?: string;
  industry?: string;
  location?: string;
  employeeCount?: number;
  pageTitle: string;
  linkedinUrl: string;
  aboutText?: string;
}

export class SeleniumLinkedinCompanyScraper {
  private driver: WebDriver | null = null;

  async initialize() {
    if (this.driver) return;

    const options = new chrome.Options();
    options.addArguments('--window-size=1440,900');
    options.addArguments('--disable-blink-features=AutomationControlled');

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    Logger.success('✅ Selenium LinkedIn Company Scraper ready');
  }

  async scrapeCompany(linkedinUrl: string): Promise<LinkedinCompanyPublicInfo> {
    if (!this.driver) {
      throw new Error('Driver chưa khởi tạo');
    }

    Logger.info(`🔎 Mở LinkedIn company page: ${linkedinUrl}`);

    await this.driver.get(linkedinUrl);
    await this.driver.wait(until.elementLocated(By.css('body')), 15000);

    const pageTitle = await this.driver.getTitle();
    const bodyText = await this.driver.findElement(By.css('body')).getText();

    let name: string | undefined;

    // ưu tiên lấy h1 nếu hợp lệ
    try {
      const h1 = await this.driver.findElement(By.css('h1'));
      const h1Text = (await h1.getText()).trim();

      if (this.isValidCompanyName(h1Text)) {
        name = h1Text;
      }
    } catch {
      //
    }

    // fallback: lấy từ title
    if (!name) {
      const titleName = this.extractNameFromTitle(pageTitle);
      if (this.isValidCompanyName(titleName)) {
        name = titleName;
      }
    }

    // fallback: lấy từ slug url
    if (!name) {
      const urlName = this.extractNameFromLinkedinUrl(linkedinUrl);
      if (this.isValidCompanyName(urlName)) {
        name = urlName;
      }
    }

    const website = this.extractWebsite(bodyText);
    const industry = this.extractIndustry(bodyText);
    const location = this.extractLocation(bodyText);
    const employeeCount = this.extractEmployeeCount(bodyText);
    const aboutText = this.extractAboutText(bodyText);

    return {
      name,
      website,
      industry,
      location,
      employeeCount,
      pageTitle,
      linkedinUrl,
      aboutText,
    };
  }

  private isValidCompanyName(value?: string): boolean {
    if (!value) return false;

    const cleaned = value.trim().toLowerCase();

    const invalidValues = [
      'tham gia linkedin',
      'join linkedin',
      'join now',
      'sign in',
      'login',
      'đăng nhập',
      'đăng ký',
      'linkedin',
    ];

    if (invalidValues.includes(cleaned)) return false;
    if (cleaned.length < 2 || cleaned.length > 100) return false;

    return true;
  }

  private extractNameFromTitle(title: string): string | undefined {
    if (!title) return undefined;

    const cleaned = title
      .replace(/\|\s*LinkedIn.*$/i, '')
      .replace(/\s*-\s*LinkedIn.*$/i, '')
      .trim();

    return cleaned || undefined;
  }

  private extractNameFromLinkedinUrl(url: string): string | undefined {
    try {
      const pathname = new URL(url).pathname;
      const parts = pathname.split('/').filter(Boolean);

      const slug = parts[1] || parts[0];
      if (!slug) return undefined;

      return slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    } catch {
      return undefined;
    }
  }

  private extractWebsite(text: string): string | undefined {
    const matches = text.match(/https?:\/\/[^\s]+/g) || [];
    return matches.find((url) => !url.includes('linkedin.com'));
  }

  private extractIndustry(text: string): string | undefined {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const commonIndustries = [
      'Consumer Goods',
      'Food and Beverage Services',
      'Manufacturing',
      'Retail',
      'Financial Services',
      'Technology',
      'Software Development',
      'Banking',
      'Dairy Product Manufacturing',
      'Food Production',
      'Hospitality',
      'Education',
      'Healthcare',
      'Insurance',
      'Logistics',
      'Telecommunications',
      'Automotive',
      'Pharmaceutical',
      'Construction',
      'Media',
      'Fashion',
      'Energy',
    ];

    return lines.find((line) =>
      commonIndustries.some((item) =>
        line.toLowerCase().includes(item.toLowerCase())
      )
    );
  }

  private extractLocation(text: string): string | undefined {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const locationHints = [
      'Vietnam',
      'Ho Chi Minh',
      'Hồ Chí Minh',
      'Hanoi',
      'Singapore',
      'Bangkok',
      'Jakarta',
      'Da Nang',
      'Đà Nẵng',
    ];

    return lines.find((line) =>
      locationHints.some((hint) =>
        line.toLowerCase().includes(hint.toLowerCase())
      )
    );
  }

  private extractEmployeeCount(text: string): number | undefined {
    const match = text.match(/(\d[\d,]*)\s+employees/i);
    if (!match) return undefined;

    return Number(match[1].replace(/,/g, ''));
  }

  private extractAboutText(text: string): string | undefined {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) return undefined;

    return cleaned.slice(0, 500);
  }

  async close() {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
      Logger.info('🔴 Selenium LinkedIn Company Scraper closed');
    }
  }
}