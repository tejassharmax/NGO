import { icon, initials, pagePath } from './utils.js';
import { getChildren, calculateAge } from './storage.js';

export function searchChildren(query) {
  const term = query.trim().toLowerCase();
  return getChildren().filter((child) => !term || Object.values(child).some((value) => String(value).toLowerCase().includes(term)));
}

export function globalSearchMarkup(query = '') {
  const results = searchChildren(query).slice(0, 5);
  return `<div class="modal-backdrop" role="presentation"><section class="modal global-search" role="dialog" aria-modal="true" aria-labelledby="search-title"><header class="global-search__input"><span>${icon('search')}</span><input id="global-search-input" class="input" value="${query}" placeholder="Search children, guardians, health records…" aria-label="Search all child records" autofocus><kbd>Esc</kbd></header><div class="global-search__results"><p class="global-search__hint" id="search-title">Search across all child records</p>${results.length ? results.map((child) => {
    const age = calculateAge(child.dob);
    return `<a class="global-search__result" href="${pagePath('child-profile')}?id=${child.id}"><span class="table-avatar">${initials(child.name)}</span><span><b>${child.name}</b><small>${child.id} · ${age || '—'} · ${child.blood || '—'}</small></span><span class="global-search__go">${icon('arrowRight')}</span></a>`;
  }).join('') : '<div class="empty-state"><span class="empty-state__icon">'+icon('search')+'</span><h3>No matching records</h3><p>Try a name, guardian, phone number, ID, or blood group.</p></div>'}</div></section></div>`;
}
