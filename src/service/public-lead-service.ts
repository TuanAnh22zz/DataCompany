import { CompanySeedReader } from '../crawlers/company-seed-reader';
import { CompanyPublicEnricher } from '../enrichers/company-public-enricher';
import { SeleniumPublicTeamScraper } from '../crawlers/selenium-public-team-scraper';
import { filterLeadershipEmployees } from '../utils/leadership-filter';
import { EmployeeCleaner } from '../utils/employee-cleaner';
import type { Company, Employee } from '../types';
import { Logger } from '../utils/logger';

export class PublicLeadService {
  async generate(industry: string, limit: number = 5): Promise<{
    companies: Company[];
    employees: Employee[];
  }> {
    Logger.info('STEP 1: đọc company theo ngành');
    const seedReader = new CompanySeedReader();
    const seedCompanies = await seedReader.readCompaniesByIndustry(industry);

    const safeLimit = limit > 0 ? limit : 5;
    const targetCompanies = seedCompanies.slice(0, safeLimit);

    Logger.info(
      `STEP 2: tìm thấy ${seedCompanies.length} companies, xử lý ${targetCompanies.length} companies`
    );

    const enricher = new CompanyPublicEnricher();
    const enrichedCompanies = await enricher.enrichMany(targetCompanies);

    Logger.info('STEP 3: scrape public leadership profiles');
    const teamScraper = new SeleniumPublicTeamScraper();
    await teamScraper.initialize();

    const allEmployees: Employee[] = [];

    try {
      for (let i = 0; i < enrichedCompanies.length; i++) {
        const company = enrichedCompanies[i];

        Logger.info(
          `👥 [${i + 1}/${enrichedCompanies.length}] Scrape leadership: ${company.name}`
        );

        const employees = await teamScraper.scrapeCompanyTeam(company);

        Logger.info(
          `➡️ ${company.name}: ${employees.length} public profiles found`
        );

        allEmployees.push(...employees);
      }
    } finally {
      await teamScraper.close();
    }

    const cleaner = new EmployeeCleaner();

    const deduped = this.deduplicateEmployees(allEmployees);
    const leadershipOnly = filterLeadershipEmployees(deduped);
    const finalEmployees = cleaner.clean(leadershipOnly);

    Logger.info('STEP 4: hoàn tất generate');
    Logger.info(`✅ Total companies: ${enrichedCompanies.length}`);
    Logger.info(`✅ Total leadership profiles: ${finalEmployees.length}`);

    return {
      companies: this.deduplicateCompanies(enrichedCompanies),
      employees: finalEmployees,
    };
  }

  private deduplicateCompanies(companies: Company[]): Company[] {
    const seen = new Set<string>();

    return companies.filter((company) => {
      const key = company.linkedinUrl || company.website || company.name;

      if (!key || seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }

  private deduplicateEmployees(employees: Employee[]): Employee[] {
    const seen = new Set<string>();

    return employees.filter((employee) => {
      const key =
        employee.linkedinUrl ||
        `${employee.companyName}|${employee.name}|${employee.title || ''}`;

      if (!key || seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }
}