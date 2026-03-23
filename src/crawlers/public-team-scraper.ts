import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Company, Employee } from '../types';
import { Logger } from '../utils/logger';

export class PublicTeamScraper {
  private teamPathCandidates = [
    '',
    '/about',
    '/about-us',
    '/leadership',
    '/team',
    '/management',
    '/our-team',
    '/gioi-thieu',
    '/ban-lanh-dao',
    '/doi-ngu',
  ];

  async scrapeCompanyPublicEmployees(company: Company): Promise<Employee[]> {
    if (!company.website) {
      Logger.warn(`⚠️ ${company.name} không có website`);
      return [];
    }

    const employees: Employee[] = [];

    for (const path of this.teamPathCandidates) {
      const url = this.joinUrl(company.website, path);

      try {
        Logger.info(`🔎 Kiểm tra trang public team: ${url}`);

        const html = await this.fetchHtml(url);
        if (!html) continue;

        const parsed = this.parseEmployeesFromHtml(html, company, url);

        if (parsed.length > 0) {
          Logger.success(`✅ Tìm thấy ${parsed.length} profile công khai tại ${url}`);
          employees.push(...parsed);
        }
      } catch (error) {
        Logger.warn(`⚠️ Không parse được ${url}`);
      }
    }

    return this.deduplicateEmployees(employees);
  }

  async scrapeMany(companies: Company[]): Promise<Employee[]> {
    const allEmployees: Employee[] = [];

    for (const company of companies) {
      const employees = await this.scrapeCompanyPublicEmployees(company);
      allEmployees.push(...employees);
    }

    return this.deduplicateEmployees(allEmployees);
  }

  private async fetchHtml(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (typeof response.data !== 'string') {
        return null;
      }

      return response.data;
    } catch {
      return null;
    }
  }

  private parseEmployeesFromHtml(
    html: string,
    company: Company,
    sourceUrl: string
  ): Employee[] {
    const $ = cheerio.load(html);
    const results: Employee[] = [];

    const cardSelectors = [
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
      '.card',
    ];

    for (const selector of cardSelectors) {
      $(selector).each((_, el) => {
        const name = this.extractName($, el);
        const title = this.extractTitle($, el);
        const linkedinUrl = this.extractLinkedin($, el);
        const location = this.extractLocation($, el);

        if (!name) return;

        results.push({
          companyName: company.name,
          name,
          title,
          linkedinUrl,
          location: location || company.location,
          sourceUrl,
          createdAt: new Date(),
        });
      });

      if (results.length > 0) break;
    }

    // fallback: parse anchor/profile blocks nếu không match selector
    if (results.length === 0) {
      $('a, div, section').each((_, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (!text) return;

        const linkedinUrl = this.extractLinkedin($, el);
        if (!linkedinUrl) return;

        const lines = text.split('|').map((s) => s.trim()).filter(Boolean);
        const name = lines[0];
        const title = lines[1];

        if (!name || name.length < 3) return;

        results.push({
          companyName: company.name,
          name,
          title,
          linkedinUrl,
          location: company.location,
          sourceUrl,
          createdAt: new Date(),
        });
      });
    }

    return this.deduplicateEmployees(results);
  }

  private extractName($: cheerio.CheerioAPI, el:  any): string {
    const selectors = ['h1', 'h2', 'h3', 'h4', '.name', '.member-name', '.title-name'];
    for (const selector of selectors) {
      const value = $(el).find(selector).first().text().replace(/\s+/g, ' ').trim();
      if (value) return value;
    }

    const directText = $(el).text().replace(/\s+/g, ' ').trim();
    return directText.split('|')[0]?.trim() || '';
  }

  private extractTitle(
    $: cheerio.CheerioAPI,
    el:  any
  ): string | undefined {
    const selectors = [
      '.position',
      '.title',
      '.role',
      '.job-title',
      '.member-role',
      '.designation',
      'p',
      'span',
    ];

    for (const selector of selectors) {
      const value = $(el).find(selector).first().text().replace(/\s+/g, ' ').trim();
      if (value) return value;
    }

    return undefined;
  }

  private extractLinkedin(
    $: cheerio.CheerioAPI,
    el:  any
  ): string | undefined {
    const link = $(el).find('a[href*="linkedin.com"]').attr('href');
    return link || undefined;
  }

  private extractLocation(
    $: cheerio.CheerioAPI,
    el:  any
  ): string | undefined {
    const selectors = ['.location', '.address', '.city'];
    for (const selector of selectors) {
      const value = $(el).find(selector).first().text().replace(/\s+/g, ' ').trim();
      if (value) return value;
    }
    return undefined;
  }

  private joinUrl(baseUrl: string, path: string): string {
    const normalizedBase = baseUrl.endsWith('/')
      ? baseUrl.slice(0, -1)
      : baseUrl;

    if (!path) return normalizedBase;
    return `${normalizedBase}${path}`;
  }

  private deduplicateEmployees(employees: Employee[]): Employee[] {
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
}