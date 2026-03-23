import { Builder, By, until, WebDriver } from 'selenium-webdriver';
const chrome = require('selenium-webdriver/chrome');
import { Logger } from '../utils/logger';

export interface WebsiteScrapeResult {
  pageTitle: string;
  emails: string[];
  phones: string[];
  linkedinLinks: string[];
  contactLinks: string[];
  teamLinks: string[];
  allLinks: string[];
}

export class SeleniumWebsiteScraper {
  private driver: WebDriver | null = null;

  async initialize() {
    const options = new chrome.Options();
    options.addArguments('--window-size=1440,900');
    options.addArguments('--disable-blink-features=AutomationControlled');

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    Logger.success('✅ Selenium Website Scraper ready');
  }

  async scrapeWebsite(url: string): Promise<WebsiteScrapeResult> {
    if (!this.driver) {
      throw new Error('Driver chưa khởi tạo');
    }

    Logger.info(`🔎 Mở website: ${url}`);

    await this.driver.get(url);
    await this.driver.wait(until.elementLocated(By.css('body')), 10000);

    const pageTitle = await this.driver.getTitle();
    const bodyText = await this.driver.findElement(By.css('body')).getText();

    const linkElements = await this.driver.findElements(By.css('a'));
    const allLinks: string[] = [];

    for (const element of linkElements) {
      try {
        const href = await element.getAttribute('href');
        if (href) allLinks.push(href);
      } catch {
        //
      }
    }

    const uniqueLinks = [...new Set(allLinks)];

    return {
      pageTitle,
      emails: this.extractEmails(bodyText),
      phones: this.extractPhones(bodyText),
      linkedinLinks: uniqueLinks.filter((link) => link.includes('linkedin.com')),
      contactLinks: uniqueLinks.filter((link) =>
        this.containsAny(link.toLowerCase(), ['contact', 'lien-he'])
      ),
      teamLinks: uniqueLinks.filter((link) =>
        this.containsAny(link.toLowerCase(), [
          'team',
          'leadership',
          'management',
          'about',
          'gioi-thieu',
          'ban-lanh-dao',
          'doi-ngu',
        ])
      ),
      allLinks: uniqueLinks,
    };
  }

  private extractEmails(text: string): string[] {
    const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    return [...new Set(matches)];
  }

  private extractPhones(text: string): string[] {
    const matches = text.match(/(\+84|0)[0-9\s.\-]{8,13}/g) || [];

    const cleaned = matches
      .map((item: string) => item.replace(/[^\d+]/g, ''))
      .filter((item: string) => item.length >= 9 && item.length <= 12)
      .filter((item: string) => item !== '0300588569');

    return [...new Set(cleaned)];
  }

  private containsAny(value: string, keywords: string[]): boolean {
    return keywords.some((keyword) => value.includes(keyword));
  }

  async close() {
    if (this.driver) {
      await this.driver.quit();
      Logger.info('🔴 Selenium Website Scraper closed');
    }
  }
}