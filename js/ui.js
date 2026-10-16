/**
 * ui.js
 * Small markup helpers shared by the page renderers in router.js and family.js.
 */

import { icon, escapeHTML } from './utils.js';
import { getSession } from './session.js';

export const heading = (title, description, actions) => `<div class="page-heading"><div class="page-heading__copy"><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="page-heading__actions">${actions}</div>` : ''}</div>`;

export const statCard = (label, value, glyph, color = 'blue') => `
  <article class="stat-card stat-card--${color}">
    <div class="stat-card__top">
      <span class="stat-card__label" title="${escapeHTML(label)}">${label}</span>
      <span class="stat-card__icon stat-card__icon--${color}">${icon(glyph)}</span>
    </div>
    <div class="stat-card__number">${value}</div>
  </article>
`;

export const field = (label, name, placeholder, type = 'text', hint = '', value = '', extra = '') => `<label class="field"><span class="field__label">${label}</span><input class="input" name="${name}" type="${type}" placeholder="${placeholder}" value="${escapeHTML(value)}" ${extra}>${hint ? `<span class="field__hint">${hint}</span>` : ''}</label>`;

export function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const matchDMY = dateStr.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (matchDMY) {
    const [_, d, m, y] = matchDMY;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  try { const d = new Date(dateStr); if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10); } catch (e) { }
  return '';
}

export function getURLParam(key) {
  let searchParams = new URLSearchParams(window.location.search);
  let val = searchParams.get(key);
  if (!val && window.location.hash.includes('?')) {
    const hashQuery = window.location.hash.split('?')[1];
    val = new URLSearchParams(hashQuery).get(key);
  }
  return val;
}

export function getDynamicGreeting() {
  const hour = new Date().getHours();
  const session = getSession() || {};
  const firstName = escapeHTML(String(session.displayName || '').trim().split(/\s+/)[0] || 'there');
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 17) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}
