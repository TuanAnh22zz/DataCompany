import { Builder, By, until, WebDriver } from 'selenium-webdriver';
const chrome = require('selenium-webdriver/chrome');
import { Logger } from '../utils/logger';
import type { Company } from '../types';

export class IndustryCompanyDiscovery {
  private driver: WebDriver | null = null;

  async initialize() {
    const options = new chrome.Options();
    options.addArguments('--window-size=1440,900');

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    Logger.success('✅ IndustryCompanyDiscovery ready');
  }

  async discover(industry: string, maxResults = 5): Promise<Company[]> {
    if (!this.driver) throw new Error('Driver chưa khởi tạo');

    const query = `${industry} companies in Vietnam official website`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    Logger.info(`🔎 Discovery query: ${query}`);
    Logger.info(`🌐 Search URL: ${searchUrl}`);

    await this.driver.get(searchUrl);
    await this.driver.wait(until.elementLocated(By.css('body')), 10000);

    const bodyText = await this.driver.findElement(By.css('body')).getText();
    Logger.info(`📄 Page text preview: ${bodyText.slice(0, 500)}`);

    const links = await this.driver.findElements(By.css('a'));
    Logger.info(`🔗 Total anchor tags: ${links.length}`);

    const urls: string[] = [];

    for (const link of links) {
      try {
        const href = await link.getAttribute('href');
        const text = await link.getText();

        if (href) {
          Logger.info(`LINK => text="${text}" href="${href}"`);
        }

        if (!href) continue;

        if (
          href.startsWith('http') &&
          !href.includes('google.com') &&
          !href.includes('youtube.com') &&
          !href.includes('facebook.com') &&
          !href.includes('linkedin.com') &&
          !href.includes('wikipedia.org')
        ) {
          urls.push(href);
        }
      } catch {
        //
      }
    }

    const unique = [...new Set(urls)].slice(0, maxResults);

    Logger.info(`✅ Filtered URLs: ${JSON.stringify(unique, null, 2)}`);

    return unique.map((website) => ({
      name: this.domainToName(website),
      website,
      industry,
      location: 'Vietnam',
      createdAt: new Date(),
    }));
  }

  private domainToName(url: string): string {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      return host
        .split('.')[0]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    } catch {
      return url;
    }
  }

  async close() {
    if (this.driver) {
      await this.driver.quit();
      Logger.info('🔴 IndustryCompanyDiscovery closed');
    }
  }
}