export const sum = <T,>(items: readonly T[], value: (item: T) => number): number =>
  items.reduce((total, item) => total + value(item), 0);

export const formatMoney = (n: number): string => 'A$' + n.toLocaleString('en-AU');

/** A$312K, A$1.26M */
export function formatShortMoney(n: number): string {
  if (n >= 1e6) return 'A$' + (n / 1e6).toFixed(2).replace(/0$/, '') + 'M';
  if (n >= 1e3) return 'A$' + Math.round(n / 1e3) + 'K';
  return 'A$' + n;
}
