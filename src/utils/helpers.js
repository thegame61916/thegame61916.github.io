export const byId = (items = []) => Object.fromEntries(items.map((item) => [item.id, item]));
export const externalAttrs = { target: '_blank', rel: 'noopener noreferrer' };
export const hasValue = (v) => v !== undefined && v !== null && String(v).trim() !== '';
export const asset = (path) => path || '/assets/logos/missing.svg';
export const prettyDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
};
export const unique = (arr) => [...new Set(arr.filter(Boolean))];
