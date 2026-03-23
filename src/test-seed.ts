import { CompanySeedReader } from './crawlers/company-seed-reader';
import { Logger } from './utils/logger';

async function main() {
  try {
    Logger.info('=== TEST SEED READER ===');

    const reader = new CompanySeedReader();
    const companies = await reader.readCompaniesByIndustry('fmcg');

    Logger.success(`Tổng số công ty: ${companies.length}`);

    companies.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   Industry: ${company.industry}`);
      console.log(`   Location: ${company.location || 'N/A'}`);
      console.log(`   Website: ${company.website || 'N/A'}`);
      console.log(`   LinkedIn: ${company.linkedinUrl || 'N/A'}`);
      console.log('');
    });
  } catch (error) {
    Logger.error('❌ Lỗi test seed:', error);
  }
}

main();