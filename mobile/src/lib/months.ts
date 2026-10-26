export type MonthYear = { month: number; year: number };

const NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function addMonths({ month, year }: MonthYear, n: number): MonthYear {
  const index = year * 12 + (month - 1) + n;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function monthLabel({ month, year }: MonthYear) {
  return `${NAMES[month - 1]} ${year}`;
}
