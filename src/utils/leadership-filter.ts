import type { Employee } from '../types';

export function isLeadershipTitle(title?: string): boolean {
  if (!title) return false;

  const lower = title.toLowerCase();

  const leadershipKeywords = [
    'ceo',
    'chief executive officer',
    'founder',
    'co-founder',
    'president',
    'general director',
    'managing director',
    'director',
    'chief',
    'head',
    'chairman',
    'board member',
    'executive',
    'vp',
    'vice president',
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
  ];

  return leadershipKeywords.some((keyword) => lower.includes(keyword));
}

export function filterLeadershipEmployees(employees: Employee[]): Employee[] {
  const filtered = employees.filter((employee) =>
    isLeadershipTitle(employee.title)
  );

  // nếu không ai match leadership thì trả về top 3 gốc
  // để không bị rỗng hoàn toàn
  if (filtered.length === 0) {
    return employees.slice(0, 3);
  }

  return filtered;
}