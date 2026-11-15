export type ExpirationStatus = 'expired' | 'expiring-soon' | 'fresh';

export function getTodayDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateKeyToDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function dateKeyToDayNumber(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

export function addDays(dateKey: string, days: number) {
  const date = dateKeyToDate(dateKey);
  date.setDate(date.getDate() + days);
  return getTodayDateKey(date);
}

export function getExpirationStatus(expirationDate: string, today = getTodayDateKey()): ExpirationStatus {
  const difference = dateKeyToDayNumber(expirationDate) - dateKeyToDayNumber(today);

  if (difference < 0) return 'expired';
  if (difference <= 3) return 'expiring-soon';
  return 'fresh';
}

export function formatDate(dateKey: string) {
  return dateKeyToDate(dateKey).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
