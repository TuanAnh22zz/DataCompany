export interface Company {
  id?: string;
  name: string;
  industry: string;
  website?: string;
  linkedinUrl?: string;
  registryUrl?: string;
  location?: string;
  employeeCount?: number;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  contactPage?: string;
  teamPage?: string;
  taxCode?: string;
  legalRepresentative?: string;
  status?: string;
  sourceUrl?: string;
  createdAt?: Date;
}

export interface Employee {
  id?: string;
  companyName: string;
  name: string;
  title?: string;
  linkedinUrl?: string;
  email?: string;
  phone?: string;
  location?: string;
  sourceUrl?: string;
  createdAt?: Date;
}