import { Builder, By, until, WebDriver } from 'selenium-webdriver';
const chrome = require('selenium-webdriver/chrome');
import { Logger } from '../utils/logger';
import type { Company, Employee } from '../types';

type CandidateEmployee = Employee & {
  score: number;
};

export class SeleniumPublicTeamScraper {
  private driver: WebDriver | null = null;

  private leadershipKeywords = [
    'ceo',
    'chief executive',
    'founder',
    'co-founder',
    'president',
    'general director',
    'managing director',
    'director',
    'chairman',
    'vice president',
    'head of',
    'chief',
    'cfo',
    'cto',
    'coo',
    'cmo',
    'giám đốc',
    'tổng giám đốc',
    'phó giám đốc',
    'chủ tịch',
    'phó chủ tịch',
    'trưởng phòng',
    'phó tổng',
    'hội đồng quản trị',
    'thành viên hội đồng',
    'ban điều hành',
  ];

  private positivePageKeywords = [
    'about',
    'about-us',
    'aboutus',
    'leadership',
    'executive',
    'management',
    'board',
    'team',
    'our-team',
    'ourteam',
    'who-we-are',
    'company',
    'governance',
    'investor-relations',
    'leadership-team',
    'executive-team',
    'board-of-directors',
    'gioi-thieu',
    'gioithieu',
    'ban-lanh-dao',
    'banlanhdao',
    'doi-ngu',
    'doingu',
    'ban-dieu-hanh',
    'bandieuhanh',
  ];

  private negativePageKeywords = [
    'news',
    'tin-tuc',
    'blog',
    'event',
    'media',
    'press',
    'cookie',
    'privacy',
    'policy',
    'legal',
    'terms',
    'sitemap',
    'faq',
    'products',
    'product',
    'san-pham',
    'khuyen-mai',
    'promotion',
  ];

  async initialize() {
    if (this.driver) return;

    const options = new chrome.Options();
    options.addArguments('--window-size=1440,900');
    options.addArguments('--disable-blink-features=AutomationControlled');

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    Logger.success('✅ Selenium Deep Site Leadership Scraper ready');
  }

  async scrapeCompanyTeam(company: Company): Promise<Employee[]> {
    if (!this.driver) {
      throw new Error('Driver chưa khởi tạo');
    }

    const candidateUrls = await this.discoverRelevantUrls(company);
    Logger.info(`🔗 ${company.name}: ${candidateUrls.length} candidate URLs`);

    const allCandidates: CandidateEmployee[] = [];

    for (const url of candidateUrls) {
      try {
        Logger.info(`🔎 Crawl page: ${url}`);

        await this.driver.get(url);
        await this.driver.wait(until.elementLocated(By.css('body')), 8000);

        const pageCandidates = await this.extractCandidatesFromCurrentPage(company, url);
        allCandidates.push(...pageCandidates);
      } catch {
        Logger.warn(`⚠️ Không parse được ${url}`);
      }
    }

    const finalEmployees = this.rankAndClean(allCandidates).slice(0, 5);

    Logger.success(
      `✅ ${company.name}: final public leadership profiles = ${finalEmployees.length}`
    );

    return finalEmployees.map(({ score, ...employee }) => employee);
  }

  /**
   * 1) Lấy internal links từ homepage
   * 2) Chấm điểm
   * 3) Crawl top links phù hợp nhất
   */
  private async discoverRelevantUrls(company: Company): Promise<string[]> {
    if (!this.driver || !company.website) return [];

    const base = company.website.replace(/\/$/, '');
    const urlScores = new Map<string, number>();

    const seedUrls = [
      base,
      `${base}/about`,
      `${base}/about-us`,
      `${base}/aboutus`,
      `${base}/leadership`,
      `${base}/management`,
      `${base}/board`,
      `${base}/team`,
      `${base}/our-team`,
      `${base}/who-we-are`,
      `${base}/governance`,
      `${base}/executive-team`,
      `${base}/board-of-directors`,
      `${base}/gioi-thieu`,
      `${base}/ban-lanh-dao`,
      `${base}/doi-ngu`,
      `${base}/ban-dieu-hanh`,
      company.teamPage || '',
    ].filter(Boolean);

    for (const url of seedUrls) {
      urlScores.set(url, this.scorePageUrl(url));
    }

    // crawl homepage
    try {
      await this.driver.get(base);
      await this.driver.wait(until.elementLocated(By.css('body')), 8000);

      const anchors = await this.driver.findElements(By.css('a'));

      for (const anchor of anchors) {
        try {
          const href = await anchor.getAttribute('href');
          const text = (await anchor.getText()).trim().toLowerCase();

          if (!href) continue;
          if (!href.startsWith(base)) continue;

          const target = `${href} ${text}`.toLowerCase();
          const score = this.scorePageUrl(target);

          if (score > 0) {
            urlScores.set(href, Math.max(score, urlScores.get(href) || 0));
          }
        } catch {
          //
        }
      }
    } catch {
      Logger.warn(`⚠️ Không crawl được homepage của ${company.name}`);
    }

    // sort theo score, giữ tối đa 20 links
    return [...urlScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .filter(([, score]) => score > 0)
      .slice(0, 20)
      .map(([url]) => url);
  }

  private scorePageUrl(target: string): number {
    const lower = target.toLowerCase();
    let score = 0;

    for (const keyword of this.positivePageKeywords) {
      if (lower.includes(keyword)) score += 3;
    }

    for (const keyword of this.negativePageKeywords) {
      if (lower.includes(keyword)) score -= 5;
    }

    return score;
  }

  private async extractCandidatesFromCurrentPage(
    company: Company,
    sourceUrl: string
  ): Promise<CandidateEmployee[]> {
    const results: CandidateEmployee[] = [];

    // 1) parse text body
    const textCandidates = await this.parseLeadershipFromText(company, sourceUrl);
    results.push(...textCandidates);

    // 2) thử parse profile cards nếu có
    const cardCandidates = await this.parseProfileCards(company, sourceUrl);
    results.push(...cardCandidates);

    return results;
  }

  private async parseLeadershipFromText(
    company: Company,
    sourceUrl: string
  ): Promise<CandidateEmployee[]> {
    if (!this.driver) return [];

    const bodyText = await this.driver.findElement(By.css('body')).getText();
    const lines = bodyText.split('\n').map((l) => l.trim()).filter(Boolean);

    const employees: CandidateEmployee[] = [];

    for (let i = 0; i < lines.length - 1; i++) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];

      if (!currentLine || !nextLine) continue;

      const title = nextLine;
      const titleLower = title.toLowerCase();

      const hasLeadershipKeyword = this.leadershipKeywords.some((keyword) =>
        titleLower.includes(keyword)
      );

      if (!hasLeadershipKeyword) continue;

      const name = this.cleanPersonName(currentLine);

      if (!this.isValidPersonName(name)) continue;
      if (!this.isGoodTitle(title)) continue;

      const score = this.scoreCandidate(name, title, sourceUrl, false);

      employees.push({
        companyName: company.name,
        name,
        title,
        location: company.location,
        sourceUrl,
        createdAt: new Date(),
        score,
      });

      if (employees.length >= 10) break;
    }

    return employees;
  }

  private async parseProfileCards(
    company: Company,
    sourceUrl: string
  ): Promise<CandidateEmployee[]> {
    if (!this.driver) return [];

    const selectors = [
      '.team-member',
      '.member',
      '.leadership-item',
      '.profile-card',
      '.our-team-item',
      '.management-item',
      '.executive',
      '.leader',
      '.staff',
      '.person',
      '.team-item',
      '.board-member',
      '.leadership-card',
      '.member-card',
      '.profile-item',
    ];

    for (const selector of selectors) {
      const cards = await this.driver.findElements(By.css(selector));

      if (cards.length === 0) continue;

      Logger.info(`📦 ${selector}: ${cards.length} cards`);

      const results: CandidateEmployee[] = [];

      for (const card of cards) {
        const text = await card.getText();
        const compactText = text.replace(/\s+/g, ' ').trim();

        if (!compactText || compactText.length < 4 || compactText.length > 220) {
          continue;
        }

        const lines = text
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);

        const rawName = lines[0];
        const title = lines[1];
        const name = this.cleanPersonName(rawName || '');

        if (!this.isValidPersonName(name)) continue;
        if (title && !this.isGoodTitle(title)) continue;

        let linkedinUrl: string | undefined;

        try {
          const links = await card.findElements(By.css('a'));
          for (const link of links) {
            const href = await link.getAttribute('href');
            if (href && href.includes('linkedin.com')) {
              linkedinUrl = href;
              break;
            }
          }
        } catch {
          //
        }

        const score = this.scoreCandidate(name, title || '', sourceUrl, !!linkedinUrl);

        results.push({
          companyName: company.name,
          name,
          title,
          linkedinUrl,
          location: company.location,
          sourceUrl,
          createdAt: new Date(),
          score,
        });
      }

      if (results.length > 0) return results;
    }

    return [];
  }

  private scoreCandidate(
    name: string,
    title: string,
    sourceUrl: string,
    hasLinkedin: boolean
  ): number {
    let score = 0;
    const titleLower = title.toLowerCase();
    const urlLower = sourceUrl.toLowerCase();

    if (this.isValidPersonName(name)) score += 3;
    if (this.isGoodTitle(title)) score += 3;

    if (this.leadershipKeywords.some((k) => titleLower.includes(k))) score += 5;

    if (hasLinkedin) score += 3;

    if (
      ['leadership', 'executive', 'board', 'management', 'governance'].some((k) =>
        urlLower.includes(k)
      )
    ) {
      score += 4;
    }

    if (['about', 'who-we-are', 'gioi-thieu'].some((k) => urlLower.includes(k))) {
      score += 2;
    }

    if (this.negativePageKeywords.some((k) => urlLower.includes(k))) {
      score -= 8;
    }

    return score;
  }

  private rankAndClean(candidates: CandidateEmployee[]): CandidateEmployee[] {
    const cleaned = candidates.filter((candidate) => {
      if (!this.isValidPersonName(candidate.name)) return false;
      if (candidate.title && !this.isGoodTitle(candidate.title)) return false;
      if (candidate.score < 6) return false;
      return true;
    });

    const deduped = this.deduplicate(cleaned);

    return deduped.sort((a, b) => b.score - a.score);
  }

  private cleanPersonName(raw: string): string {
    return raw
      .replace(/^(ông\.?|bà\.?|mr\.?|mrs\.?|ms\.?|dr\.?)\s*/i, '')
      .trim();
  }

  private isValidPersonName(name?: string): boolean {
    if (!name) return false;

    const cleaned = name.trim();
    if (cleaned.length < 4 || cleaned.length > 60) return false;

    const invalidWords = [
      'tin tức',
      'sự kiện',
      'news',
      'event',
      'blog',
      'insight',
      'ưu điểm',
      'giải pháp',
      'sản phẩm',
      'dịch vụ',
      'contact',
      'email',
      'phone',
      'copyright',
      'điều khoản',
      'xem thêm',
      'learn more',
      'read more',
      'about',
      'team',
      'thông điệp',
      'về chúng tôi',
      'cùng một nhà',
      'cookie',
      'legal',
      'terms',
      'privacy',
      'settings',
      'independent lead director',
      'responsibilities',
    ];

    const lower = cleaned.toLowerCase();

    if (invalidWords.some((word) => lower.includes(word))) {
      return false;
    }

    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length < 2) return false;
    if (words.length > 6) return false;

    return true;
  }

  private isGoodTitle(title?: string): boolean {
    if (!title) return true;

    const cleaned = title.trim();
    const lower = cleaned.toLowerCase();

    if (cleaned.length > 120) return false;

    const invalidWords = [
      'tin tức',
      'sự kiện',
      'news',
      'event',
      'blog',
      'insight',
      'ưu điểm',
      'giải pháp',
      'sản phẩm',
      'dịch vụ',
      'ký kết',
      'triển khai',
      'xem thêm',
      'learn more',
      'read more',
      'miễn phí',
      'khuyến mãi',
      'thông báo',
      'cookie',
      'legal',
      'terms',
      'privacy',
      'settings',
      'authority and responsibilities',
    ];

    if (invalidWords.some((word) => lower.includes(word))) {
      return false;
    }

    return true;
  }

  private deduplicate<T extends { linkedinUrl?: string; companyName: string; name: string; title?: string }>(
    employees: T[]
  ): T[] {
    const seen = new Set<string>();

    return employees.filter((employee) => {
      const key =
        employee.linkedinUrl ||
        `${employee.companyName}|${employee.name}|${employee.title || ''}`;

      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async close() {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
      Logger.info('🔴 Selenium Deep Site Leadership Scraper closed');
    }
  }
}