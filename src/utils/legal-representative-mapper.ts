import type { Company, Employee } from '../types';

export class LegalRepresentativeMapper {
  mapCompaniesToEmployees(companies: Company[]): Employee[] {
    return companies
      .filter(
        (company) =>
          company.legalRepresentative && company.legalRepresentative.trim()
      )
      .map((company) => ({
        companyName: company.name,
        name: company.legalRepresentative!.trim(),
        title: 'Người đại diện pháp luật',
        phone: company.contactPhone || '',
        location: company.location || company.address || '',
        sourceUrl: company.sourceUrl || company.registryUrl || '',
        createdAt: new Date(),
      }));
  }
}