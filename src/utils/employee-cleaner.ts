import type { Employee } from '../types';

export class EmployeeCleaner {
  clean(employees: Employee[]): Employee[] {
    const filtered = employees.filter((employee) => this.isValidEmployee(employee));

    return this.deduplicate(filtered);
  }

  private isValidEmployee(employee: Employee): boolean {
    const name = (employee.name || '').trim();
    const title = (employee.title || '').trim();

    if (!this.isValidName(name)) return false;
    if (!this.isValidTitle(title)) return false;

    return true;
  }

  private isValidName(name: string): boolean {
    if (!name) return false;
    if (name.length < 4 || name.length > 80) return false;

    const lower = name.toLowerCase();

    const invalidWords = [
      'thông báo',
      'pháp lý',
      'cookie',
      'cookie settings',
      'terms',
      'terms of use',
      'privacy',
      'policy',
      'legal',
      'copyright',
      '©',
      'điều khoản',
      'quyền riêng tư',
      'independent lead director’s authority',
      'responsibilities',
      'tin tức',
      'sự kiện',
      'news',
      'event',
      'blog',
      'contact',
      'email',
      'phone',
      'xem thêm',
      'read more',
      'learn more',
    ];

    if (invalidWords.some((word) => lower.includes(word))) {
      return false;
    }

    // Tên người nên có từ 2 đến 5 từ
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 6) return false;

    // Không nên toàn chữ hoa dài kiểu tiêu đề
    if (name === name.toUpperCase() && name.length > 20) return false;

    // Không nên chứa quá nhiều ký tự đặc biệt
    if (/[:;{}[\]=]/.test(name)) return false;

    return true;
  }

  private isValidTitle(title: string): boolean {
    if (!title) return true;

    if (title.length > 120) return false;

    const lower = title.toLowerCase();

    const invalidWords = [
      'thông báo',
      'pháp lý',
      'cookie',
      'cookie settings',
      'terms',
      'terms of use',
      'privacy',
      'policy',
      'legal',
      'copyright',
      '©',
      'điều khoản',
      'quyền riêng tư',
      'tin tức',
      'sự kiện',
      'news',
      'event',
      'blog',
      'contact',
      'email',
      'phone',
      'read more',
      'learn more',
    ];

    if (invalidWords.some((word) => lower.includes(word))) {
      return false;
    }

    return true;
  }

  private deduplicate(employees: Employee[]): Employee[] {
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