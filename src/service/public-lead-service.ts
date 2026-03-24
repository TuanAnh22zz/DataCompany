import { CompanySeedReader } from '../crawlers/company-seed-reader';
import { CompanyPublicEnricher } from '../enrichers/company-public-enricher';
import { CompanyRegistryEnricher } from '../enrichers/company-registry-enricher';
import { LegalRepresentativeMapper } from '../utils/legal-representative-mapper';
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

    Logger.info('STEP 3: enrich public website/linkedin info');
    const publicEnricher = new CompanyPublicEnricher();
    const publicEnrichedCompanies = await publicEnricher.enrichMany(targetCompanies);

    console.log(
      'DEBUG publicEnrichedCompanies =',
      JSON.stringify(publicEnrichedCompanies, null, 2)
    );

    Logger.info('STEP 4: enrich registry info');
    const registryEnricher = new CompanyRegistryEnricher();
    const registryEnrichedCompanies = await registryEnricher.enrichMany(
      publicEnrichedCompanies
    );

    console.log(
      'DEBUG registryEnrichedCompanies =',
      JSON.stringify(registryEnrichedCompanies, null, 2)
    );

    Logger.info('STEP 5: map legal representative -> employees');
    const mapper = new LegalRepresentativeMapper();
    const employees = mapper.mapCompaniesToEmployees(registryEnrichedCompanies);

    console.log('DEBUG employees =', JSON.stringify(employees, null, 2));

    Logger.info('STEP 6: hoàn tất generate');
    Logger.info(`✅ Total companies: ${registryEnrichedCompanies.length}`);
    Logger.info(`✅ Total representatives: ${employees.length}`);

    return {
      companies: this.deduplicateCompanies(registryEnrichedCompanies),
      employees: this.deduplicateEmployees(employees),
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
      const key = `${employee.companyName}|${employee.name}|${employee.title || ''}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}