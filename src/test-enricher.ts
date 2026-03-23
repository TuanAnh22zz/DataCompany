import { CompanySeedReader } from './crawlers/company-seed-reader';
import { CompanyProfileEnricher } from './enrichers/company-profile-enricher';
import { Logger } from './utils/logger';

async function main() {
  try {
    Logger.info('=== TEST COMPANY PROFILE ENRICHER ===');

    const reader = new CompanySeedReader();
    const companies = await reader.readCompaniesByIndustry('fmcg');

    const enricher = new CompanyProfileEnricher();
    const enrichedCompanies = await enricher.enrichMany(companies);

    Logger.success(`🎉 Enrich xong ${enrichedCompanies.length} công ty`);

    enrichedCompanies.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   Website: ${company.website || 'N/A'}`);
      console.log(`   LinkedIn: ${company.linkedinUrl || 'N/A'}`);
      console.log('');
    });
  } catch (error) {
    Logger.error('❌ Lỗi test enricher:', error);
  }
}

main();