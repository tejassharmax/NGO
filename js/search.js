import { icon, initials, pagePath } from './utils.js';
import { getStudents } from './storage.js';

export function searchStudents(query) {
  const term = query.trim().toLowerCase();
  return getStudents().filter((student) => !term || Object.values(student).some((value) => String(value).toLowerCase().includes(term)));
}

export function globalSearchMarkup(query = '') {
  const results = searchStudents(query).slice(0, 5);
  return `<div class="modal-backdrop" role="presentation"><section class="modal global-search" role="dialog" aria-modal="true" aria-labelledby="search-title"><header class="global-search__input"><span>${icon('search')}</span><input id="global-search-input" class="input" value="${query}" placeholder="Search students, parents, blood group…" aria-label="Search all student records" autofocus><kbd>Esc</kbd></header><div class="global-search__results"><p class="global-search__hint" id="search-title">Search across all student records</p>${results.length ? results.map((student) => `<a class="global-search__result" href="${pagePath('student-profile')}?id=${student.id}"><span class="table-avatar">${initials(student.name)}</span><span><b>${student.name}</b><small>${student.id} · ${student.class} · ${student.blood}</small></span><span class="global-search__go">${icon('arrowRight')}</span></a>`).join('') : '<div class="empty-state"><span class="empty-state__icon">'+icon('search')+'</span><h3>No matching records</h3><p>Try a name, parent, phone number, admission ID, or blood group.</p></div>'}</div></section></div>`;
}
