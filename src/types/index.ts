export interface Company {
  id?: string;
  name: string;
  industry: string;
  website?: string;
  linkedinUrl?: string;
  location?: string;
  employeeCount?: number;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  contactPage?: string;
  teamPage?: string;
  createdAt?: Date;
}

export interface Employee {
  id?: string;
  companyName: string;
  name: string;
  title?: string;
  linkedinUrl?: string;
  location?: string;
  sourceUrl?: string;
  createdAt?: Date;
}

type CompanyCandidate = {
  name: string;
  website?: string;
  industry: string;
  location?: string;
}