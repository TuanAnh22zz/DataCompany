import { Builder, By, until, WebDriver } from 'selenium-webdriver';
const chrome = require('selenium-webdriver/chrome');
import type { Company } from '../types';
import { Logger } from '../utils/logger';

export class CompanyRegistryEnricher {
  private driver: WebDriver | null = null;

  async initialize() {
    if (this.driver) return;

    const options = new chrome.Options();
    options.addArguments('--window-size=1440,900');

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    Logger.success('✅ CompanyRegistryEnricher ready');
  }

  async close() {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
      Logger.info('🔴 CompanyRegistryEnricher closed');
    }
  }

  async enrichCompany(company: Company): Promise<Company> {
    if (!this.driver) {
      throw new Error('Driver chưa khởi tạo');
    }

    if (!company.registryUrl) {
      Logger.warn(`⚠️ ${company.name} không có registryUrl`);
      return company;
    }

    try {
      Logger.info(`🏢 Registry enrich: ${company.name}`);

      await this.driver.get(company.registryUrl);
      await this.driver.wait(until.elementLocated(By.css('body')), 10000);

      const bodyText = await this.driver.findElement(By.css('body')).getText();

      const taxCode = this.extractTaxCode(bodyText);
      const address = this.extractAddress(bodyText);
      const legalRepresentative = this.extractLegalRepresentative(bodyText);
      const phone = this.extractPhone(bodyText);
      const status = this.extractStatus(bodyText);

      const enrichedCompany: Company = {
        ...company,
        taxCode: taxCode || company.taxCode,
        address: address || company.address,
        legalRepresentative:
          this.cleanRepresentativeName(legalRepresentative) ||
          company.legalRepresentative,
        contactPhone: this.cleanPhone(phone) || company.contactPhone,
        status: status || company.status,
        sourceUrl: company.registryUrl,
      };

      Logger.info(
        `✅ Registry data: ${enrichedCompany.name} | taxCode=${enrichedCompany.taxCode || ''} | legalRepresentative=${enrichedCompany.legalRepresentative || ''} | phone=${enrichedCompany.contactPhone || ''}`
      );

      return enrichedCompany;
    } catch (error) {
      Logger.error(`❌ Registry enrich lỗi cho ${company.name}:`, error);
      return company;
    }
  }

  async enrichMany(companies: Company[]): Promise<Company[]> {
    await this.initialize();

    try {
      const results: Company[] = [];

      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        Logger.info(`🏢 [${i + 1}/${companies.length}] Registry enrich: ${company.name}`);
        const enriched = await this.enrichCompany(company);
        results.push(enriched);
      }

      return results;
    } finally {
      await this.close();
    }
  }

  private extractTaxCode(text: string): string | undefined {
    const lines = this.getLines(text);

    // Ưu tiên match dòng kiểu: "Mã số thuế 0315352478"
    for (const line of lines) {
      if (line.toLowerCase().includes('mã số thuế')) {
        const match = line.match(/\b\d{10,14}\b/);
        if (match) return match[0];
      }
    }

    // fallback: nếu label đứng riêng, lấy dòng sau có dãy số
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].toLowerCase();
      const next = lines[i + 1];

      if (line.includes('mã số thuế')) {
        const match = next.match(/\b\d{10,14}\b/);
        if (match) return match[0];
      }
    }

    return undefined;
  }

  private extractAddress(text: string): string | undefined {
    const lines = this.getLines(text);

    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();

      if (lower.includes('địa chỉ thuế') || lower === 'địa chỉ') {
        const next = lines[i + 1];
        if (next && next.length > 10) {
          return this.cleanAddress(next);
        }
      }

      if (lower.startsWith('địa chỉ ')) {
        return this.cleanAddress(lines[i].replace(/^địa chỉ\s*/i, ''));
      }
    }

    return undefined;
  }

  private extractLegalRepresentative(text: string): string | undefined {
    const lines = this.getLines(text);

    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();

      if (lower.includes('người đại diện')) {
        // TH1: label và value cùng block, dòng kế tiếp là tên
        const next = lines[i + 1];
        if (next && this.looksLikePersonName(next)) {
          return next;
        }

        // TH2: cùng dòng có tên
        const sameLine = lines[i].replace(/người đại diện/gi, '').trim();
        if (sameLine && this.looksLikePersonName(sameLine)) {
          return sameLine;
        }

        // TH3: nhìn thêm 2 dòng sau
        const next2 = lines[i + 2];
        if (next2 && this.looksLikePersonName(next2)) {
          return next2;
        }
      }
    }

    return undefined;
  }

  private extractPhone(text: string): string | undefined {
    const lines = this.getLines(text);

    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();

      if (lower.includes('điện thoại') || lower === 'phone') {
        const matchCurrent = lines[i].match(/(\+84|0)[0-9\s.\-]{8,13}/);
        if (matchCurrent) return matchCurrent[0];

        const next = lines[i + 1];
        if (next) {
          const matchNext = next.match(/(\+84|0)[0-9\s.\-]{8,13}/);
          if (matchNext) return matchNext[0];
        }
      }
    }

    return undefined;
  }

  private extractStatus(text: string): string | undefined {
    const lines = this.getLines(text);

    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();

      if (lower.includes('tình trạng') || lower.includes('status')) {
        const next = lines[i + 1];
        if (next && next.length < 80) {
          return next;
        }

        const sameLine = lines[i]
          .replace(/tình trạng/gi, '')
          .replace(/status/gi, '')
          .trim();

        if (sameLine && sameLine.length < 80) {
          return sameLine;
        }
      }
    }

    return undefined;
  }

  private getLines(text: string): string[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private looksLikePersonName(value: string): boolean {
    const cleaned = this.cleanRepresentativeName(value);
    if (!cleaned) return false;

    const lower = cleaned.toLowerCase();

    const invalidWords = [
      'ngoài ra',
      'còn đại diện',
      'doanh nghiệp',
      'đơn vị',
      'điện thoại',
      'địa chỉ',
      'mã số thuế',
      'tình trạng',
      'tên quốc tế',
      'tên viết tắt',
      'ngày hoạt động',
      'quản lý bởi',
      'loại hình',
      'ngành nghề',
    ];

    if (invalidWords.some((w) => lower.includes(w))) return false;

    const words = cleaned.split(/\s+/).filter(Boolean);
    return words.length >= 2 && words.length <= 6;
  }

  private cleanRepresentativeName(value?: string): string | undefined {
    if (!value) return undefined;

    const cleaned = value
      .split('Ngoài ra')[0]
      .split('còn đại diện')[0]
      .replace(/^ông\.?\s*/i, '')
      .replace(/^bà\.?\s*/i, '')
      .trim();

    if (!cleaned) return undefined;
    if (cleaned.length < 3 || cleaned.length > 80) return undefined;

    return cleaned;
  }

  private cleanAddress(value?: string): string | undefined {
    if (!value) return undefined;

    return value
      .replace(/^địa chỉ thuế\s*/i, '')
      .replace(/^địa chỉ\s*/i, '')
      .trim();
  }

  private cleanPhone(value?: string): string | undefined {
    if (!value) return undefined;

    const match = value.match(/(\+84|0)[0-9\s.\-]{8,13}/);
    if (!match) return undefined;

    return match[0].replace(/[^\d+]/g, '');
  }
}