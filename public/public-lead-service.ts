import { CompanySeedReader } from '../src/crawlers/company-seed-reader';
import { SeleniumCompanyContactEnricher } from '../src/enrichers/selenium-company-contact-enricher';
import type { Company, Employee } from '../src/types';
import { Logger } from '../src/utils/logger';

export class PublicLeadService {
  async generate(industry: string): Promise<{
    companies: Company[];
    employees: Employee[];
  }> {
    Logger.info('STEP 1: đọc seed company');
    const seedReader = new CompanySeedReader();
    const seedCompanies = await seedReader.readCompaniesByIndustry(industry);

    // Giới hạn trước 2 công ty để test nhanh
    const targetCompanies = seedCompanies.slice(0, 2);

    Logger.info(`STEP 2: selenium enrich ${targetCompanies.length} companies`);
    const enricher = new SeleniumCompanyContactEnricher();
    const enrichedCompanies = await enricher.enrichMany(targetCompanies);

    Logger.info('STEP 3: hoàn tất generate');
    return {
      companies: this.deduplicateCompanies(enrichedCompanies),
      employees: [],
    };
  }

  private deduplicateCompanies(companies: Company[]): Company[] {
    const seen = new Set<string>();

    return companies.filter((company) => {
      const key = company.linkedinUrl || company.website || company.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}