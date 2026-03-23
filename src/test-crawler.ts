import { GoogleCompanyFinder } from './crawlers/google-company-finder';
import { Logger } from './utils/logger';

async function testCrawlers() {
  const finder = new GoogleCompanyFinder();

  try {
    Logger.info('=== TEST 1: GOOGLE COMPANY FINDER ===');

    await finder.initialize();

    const companies = await finder.findCompanies('FMCG', 'Vietnam', 10);

    Logger.success(`Tìm thấy ${companies.length} công ty:`);

    companies.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   LinkedIn: ${company.linkedinUrl}\n`);
    });
  } catch (error) {
    Logger.error('Lỗi trong quá trình test:', error);
  } finally {
    await finder.close();
  }
}

testCrawlers();