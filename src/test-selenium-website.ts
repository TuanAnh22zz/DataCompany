import { SeleniumWebsiteScraper } from './crawlers/selenium-website-scraper';
import { Logger } from './utils/logger';

async function main() {
  const scraper = new SeleniumWebsiteScraper();

  try {
    Logger.info('=== TEST SELENIUM WEBSITE SCRAPER ===');

    await scraper.initialize();

    const result = await scraper.scrapeWebsite('https://www.vinamilk.com.vn');

    Logger.success(`Page title: ${result.pageTitle}`);
    console.log('Emails:', result.emails);
    console.log('Phones:', result.phones);
    console.log('LinkedIn links:', result.linkedinLinks);
    console.log('Contact links:', result.contactLinks);
    console.log('Team links:', result.teamLinks);
  } catch (error) {
    Logger.error('❌ Lỗi test selenium website:', error);
  } finally {
    await scraper.close();
  }
}

main();