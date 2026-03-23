import type { Company } from '../types';
import { Logger } from '../utils/logger';
import { SeleniumWebsiteScraper } from '../crawlers/selenium-website-scraper';
import { SeleniumLinkedinCompanyScraper } from '../crawlers/selenium-linkedin-company-scraper';

export class CompanyPublicEnricher {
  private websiteScraper = new SeleniumWebsiteScraper();
  private linkedinScraper = new SeleniumLinkedinCompanyScraper();
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    Logger.info('🚀 Khởi tạo shared Selenium scrapers...');
    await this.websiteScraper.initialize();
    await this.linkedinScraper.initialize();
    this.initialized = true;
  }

  async close() {
    Logger.info('🔴 Đóng shared Selenium scrapers...');
    await this.websiteScraper.close();
    await this.linkedinScraper.close();
    this.initialized = false;
  }

  async enrichCompany(company: Company): Promise<Company> {
    let enrichedCompany: Company = { ...company };

    // 1) enrich từ website
    if (company.website) {
      try {
        const websiteResult = await this.websiteScraper.scrapeWebsite(company.website);

        enrichedCompany = {
          ...enrichedCompany,
          linkedinUrl:
            enrichedCompany.linkedinUrl ||
            websiteResult.linkedinLinks.find((link) =>
              link.includes('linkedin.com/company')
            ) ||
            enrichedCompany.linkedinUrl,
          contactEmail: websiteResult.emails[0] || enrichedCompany.contactEmail || '',
          contactPhone: websiteResult.phones[0] || enrichedCompany.contactPhone || '',
          contactPage: websiteResult.contactLinks[0] || enrichedCompany.contactPage || '',
          teamPage: websiteResult.teamLinks[0] || enrichedCompany.teamPage || '',
        };
      } catch (error) {
        Logger.error(`❌ Lỗi enrich website cho ${company.name}:`, error);
      }
    }

    // 2) enrich từ linkedin company page public info
    if (enrichedCompany.linkedinUrl) {
      try {
        const linkedinInfo = await this.linkedinScraper.scrapeCompany(
          enrichedCompany.linkedinUrl
        );

        enrichedCompany = {
          ...enrichedCompany,
          name: linkedinInfo.name || enrichedCompany.name,
          website: linkedinInfo.website || enrichedCompany.website,
          industry: linkedinInfo.industry || enrichedCompany.industry,
          location: linkedinInfo.location || enrichedCompany.location,
          employeeCount: linkedinInfo.employeeCount || enrichedCompany.employeeCount,
        };
      } catch (error) {
        Logger.error(`❌ Lỗi enrich LinkedIn cho ${company.name}:`, error);
      }
    }

    return enrichedCompany;
  }

  async enrichMany(companies: Company[]): Promise<Company[]> {
    const results: Company[] = [];

    await this.initialize();

    try {
      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        Logger.info(`🚀 [${i + 1}/${companies.length}] Enrich: ${company.name}`);
        const enriched = await this.enrichCompany(company);
        results.push(enriched);
      }

      return results;
    } finally {
      await this.close();
    }
  }
}