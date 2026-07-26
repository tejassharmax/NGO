import { icon, initials, pagePath } from './utils.js';
import { getChildren, calculateAge } from './storage.js';

export function searchChildren(query) {
  const term = query.trim().toLowerCase();
  return getChildren().filter((child) => !term || Object.values(child).some((value) => String(value).toLowerCase().includes(term)));
}

export function renderSearchResultsList(query = '') {
  const results = searchChildren(query).slice(0, 7);
  if (!results.length) {
    return `<div class="empty-state" style="padding: 24px 16px;"><span class="empty-state__icon">${icon('search')}</span><h3>No matching records</h3><p style="font-size:12px; color:var(--color-text-muted);">Try searching by child name, guardian, phone number, ID, or blood group.</p></div>`;
  }
  return results.map((child) => {
    const age = calculateAge(child.dob) || child.age || '—';
    return `
      <a class="global-search__result" href="${pagePath('child-profile')}?id=${child.id}" style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; text-decoration:none; color:var(--color-text); border-bottom:1px solid var(--color-border);">
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="table-avatar" style="width:36px; height:36px; border-radius:50%; background:var(--color-primary-light); color:var(--color-primary); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px;">${initials(child.name)}</span>
          <div>
            <b style="font-size:14px; display:block;">${child.name}</b>
            <small style="font-size:11.5px; color:var(--color-text-muted);">${child.id} • ${age} • ${child.gender || '—'} • ${child.blood || '—'} • ${child.father || child.guardian || 'Guardian'}</small>
          </div>
        </div>
        <span class="global-search__go" style="color:var(--color-primary); font-size:16px;">${icon('arrowRight')}</span>
      </a>
    `;
  }).join('');
}

export function globalSearchMarkup(query = '') {
  return `
    <div class="modal-backdrop" role="presentation" style="position:fixed; inset:0; z-index:9999; background:rgba(15,23,42,0.75); backdrop-filter:blur(6px); display:flex; align-items:flex-start; justify-content:center; padding-top:80px;">
      <section class="modal global-search card" role="dialog" aria-modal="true" aria-labelledby="search-title" style="width:min(640px, 94vw); border-radius:12px; overflow:hidden; background:var(--color-bg); border:1px solid var(--color-border); box-shadow:0 20px 40px rgba(0,0,0,0.25);">
        <header class="global-search__input" style="display:flex; align-items:center; gap:12px; padding:16px; border-bottom:1px solid var(--color-border); background:var(--color-bg);">
          <span style="color:var(--color-text-muted); font-size:18px;">${icon('search')}</span>
          <input id="global-search-input" class="input" value="${query}" placeholder="Search children, guardians, health records…" aria-label="Search all child records" autofocus style="flex:1; border:0; background:transparent; font-size:16px; color:var(--color-text); outline:none;">
          <kbd style="padding:2px 8px; font-size:11px; background:var(--color-bg-alt); border:1px solid var(--color-border); border-radius:4px; color:var(--color-text-muted);">Esc</kbd>
        </header>
        <div class="global-search__results" id="global-search-results-wrap" style="max-height:60vh; overflow:auto;">
          <p class="global-search__hint" id="search-title" style="padding:10px 16px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--color-text-muted); margin:0; border-bottom:1px solid var(--color-border);">Search results</p>
          <div id="global-search-results-container">
            ${renderSearchResultsList(query)}
          </div>
        </div>
      </section>
    </div>
  `;
}
