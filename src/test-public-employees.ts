import { CompanySeedReader } from './crawlers/company-seed-reader';
import { PublicTeamScraper } from './crawlers/public-team-scraper';
import { Logger } from './utils/logger';

async function main() {
  try {
    Logger.info('=== TEST PUBLIC EMPLOYEE SCRAPER ===');

    const reader = new CompanySeedReader();
    const companies = await reader.readCompaniesByIndustry('fmcg');

    const scraper = new PublicTeamScraper();
    const employees = await scraper.scrapeMany(companies);

    Logger.success(`🎉 Tổng số employee public lấy được: ${employees.length}`);

    employees.forEach((employee, index) => {
      console.log(`${index + 1}. ${employee.name}`);
      console.log(`   Company: ${employee.companyName}`);
      console.log(`   Title: ${employee.title || 'N/A'}`);
      console.log(`   LinkedIn: ${employee.linkedinUrl || 'N/A'}`);
      console.log(`   Location: ${employee.location || 'N/A'}`);
      console.log(`   Source: ${employee.linkedinUrl || 'N/A'}`);
      console.log('');
    });
  } catch (error) {
    Logger.error('❌ Lỗi test public employee scraper:', error);
  }
}

main();