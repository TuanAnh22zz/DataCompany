import type { Company } from '../types';
import { Logger } from '../utils/logger';
import { SeleniumWebsiteScraper } from '../crawlers/selenium-website-scraper';

export class SeleniumCompanyContactEnricher {
  async enrichCompany(company: Company): Promise<Company> {
    if (!company.website) {
      Logger.warn(`⚠️ ${company.name} không có website`);
      return company;
    }

    const scraper = new SeleniumWebsiteScraper();

    try {
      await scraper.initialize();

      const result = await scraper.scrapeWebsite(company.website);

      return {
        ...company,
        linkedinUrl:
          company.linkedinUrl ||
          result.linkedinLinks.find((link) => link.includes('linkedin.com/company')) ||
          company.linkedinUrl,
        contactEmail: result.emails[0] || company.contactEmail || '',
        contactPhone: result.phones[0] || company.contactPhone || '',
        contactPage: result.contactLinks[0] || company.contactPage || '',
        teamPage: result.teamLinks[0] || company.teamPage || '',
      };
    } catch (error) {
      Logger.error(`❌ Lỗi enrich selenium cho ${company.name}:`, error);
      return company;
    } finally {
      await scraper.close();
    }
  }

  async enrichMany(companies: Company[]): Promise<Company[]> {
    const results: Company[] = [];

    for (const company of companies) {
      Logger.info(`🚀 Selenium enrich company: ${company.name}`);
      const enriched = await this.enrichCompany(company);
      results.push(enriched);
    }

    return results;
  }
}