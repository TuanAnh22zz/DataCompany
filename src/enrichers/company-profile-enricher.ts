import axios from 'axios';
import * as cheerio from 'cheerio';
import { Logger } from '../utils/logger';
import type { Company } from '../types';

export class CompanyProfileEnricher {
  async enrichLinkedinFromWebsite(company: Company): Promise<Company> {
    try {
      if (company.linkedinUrl && company.linkedinUrl.trim()) {
        Logger.info(`⏭️ Bỏ qua ${company.name} vì đã có LinkedIn`);
        return company;
      }

      if (!company.website || !company.website.trim()) {
        Logger.warn(`⚠️ ${company.name} không có website để tìm LinkedIn`);
        return company;
      }

      Logger.info(`🔎 Đang tìm LinkedIn cho ${company.name} từ website: ${company.website}`);

      const response = await axios.get(company.website, {
        timeout: 15000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const $ = cheerio.load(response.data);

      const links: string[] = [];

      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          links.push(href);
        }
      });

      const linkedinLink = this.findBestLinkedinLink(links);

      if (linkedinLink) {
        Logger.success(`✅ Tìm thấy LinkedIn cho ${company.name}: ${linkedinLink}`);
        return {
          ...company,
          linkedinUrl: linkedinLink,
        };
      }

      Logger.warn(`⚠️ Không tìm thấy LinkedIn trên website của ${company.name}`);
      return company;
    } catch (error) {
      Logger.error(`❌ Lỗi khi enrich LinkedIn cho ${company.name}:`, error);
      return company;
    }
  }

  async enrichMany(companies: Company[]): Promise<Company[]> {
    const results: Company[] = [];

    for (const company of companies) {
      const enriched = await this.enrichLinkedinFromWebsite(company);
      results.push(enriched);
    }

    return results;
  }

  private findBestLinkedinLink(links: string[]): string | undefined {
    const normalizedLinks = links
      .map((link) => link.trim())
      .filter(Boolean)
      .map((link) => this.normalizeUrl(link));

    const companyLinkedin = normalizedLinks.find((link) =>
      link.includes('linkedin.com/company/')
    );

    if (companyLinkedin) return companyLinkedin;

    const generalLinkedin = normalizedLinks.find((link) =>
      link.includes('linkedin.com')
    );

    return generalLinkedin;
  }

  private normalizeUrl(url: string): string {
    if (url.startsWith('//')) {
      return `https:${url}`;
    }

    if (url.startsWith('/')) {
      return url;
    }

    return url;
  }
}