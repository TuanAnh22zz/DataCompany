import { SeleniumLinkedinCompanyScraper } from './crawlers/selenium-linkedin-company-scraper';
import { Logger } from './utils/logger';

async function main() {
  const scraper = new SeleniumLinkedinCompanyScraper();

  try {
    Logger.info('=== TEST SELENIUM LINKEDIN COMPANY SCRAPER ===');

    await scraper.initialize();

    const result = await scraper.scrapeCompany(
      'https://www.linkedin.com/company/vinamilk/'
    );

    Logger.success(`Page title: ${result.pageTitle}`);
    console.log('Company name:', result.companyName);
    console.log('Website:', result.website);
    console.log('Page text preview:', result.pageText?.slice(0, 500));
  } catch (error) {
    Logger.error('❌ Lỗi test selenium linkedin company:', error);
  } finally {
    await scraper.close();
  }
}

main();