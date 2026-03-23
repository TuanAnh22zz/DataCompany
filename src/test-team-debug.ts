import { Builder, By, until, WebDriver } from 'selenium-webdriver';
const chrome = require('selenium-webdriver/chrome');
import { Logger } from './utils/logger';

async function main() {
  const options = new chrome.Options();
  options.addArguments('--window-size=1440,900');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  // test nhiều URL team page
  const testUrls = [
    'https://www.vinamilk.com.vn/about-us',
    'https://fpt.com/about-us',
    'https://www.vietcombank.com.vn/About',
    'https://www.masangroup.com/about/leadership',
    'https://www.techcombank.com.vn/about',
  ];

  try {
    for (const url of testUrls) {
      Logger.info(`\n🔎 Testing URL: ${url}`);

      await driver.get(url);
      await driver.wait(until.elementLocated(By.css('body')), 10000);

      const title = await driver.getTitle();
      Logger.info(`Page title: ${title}`);

      // log toàn bộ text ngắn gọn
      const bodyText = await driver.findElement(By.css('body')).getText();
      const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);

      Logger.info(`Total lines: ${lines.length}`);

      // tìm lines có dấu hiệu leadership
      const leadershipKeywords = [
        'ceo', 'director', 'founder', 'president',
        'chairman', 'head', 'chief', 'managing',
        'giám đốc', 'tổng giám đốc', 'chủ tịch',
        'phó giám đốc', 'trưởng phòng',
      ];

      console.log('\n--- LEADERSHIP LINES ---');
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        if (leadershipKeywords.some(k => lower.includes(k))) {
          // in dòng trước (có thể là tên)
          if (i > 0) console.log(`  NAME?  => ${lines[i - 1]}`);
          console.log(`  TITLE? => ${lines[i]}`);
          console.log('');
        }
      }

      // thử tìm profile cards
      const cardSelectors = [
        '.team-member', '.member', '.leadership-item',
        '.profile-card', '.executive', '.leader',
        '.person', '.board-member', '.card',
      ];

      console.log('--- CARD SELECTORS ---');
      for (const selector of cardSelectors) {
        const elements = await driver.findElements(By.css(selector));
        if (elements.length > 0) {
          console.log(`  ${selector} => ${elements.length} elements`);

          // in text của card đầu tiên
          const firstText = await elements[0].getText();
          console.log(`  FIRST CARD TEXT: ${firstText.replace(/\s+/g, ' ').trim().slice(0, 200)}`);
        }
      }

      console.log('\n======================\n');
    }
  } catch (error) {
    Logger.error('❌ Error:', error);
  } finally {
    await driver.quit();
  }
}

main();