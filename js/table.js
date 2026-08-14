import { icon, initials, pagePath, statusBadge, healthDot } from './utils.js';
import { healthStatus, calculateAge } from './storage.js';

export function childRows(children) {
  if (!children.length) return `<tr><td colspan="8"><div class="empty-state"><span class="empty-state__icon">${icon('users')}</span><h3>No children found</h3><p>Try changing your search or register a new child.</p></div></td></tr>`;
  return children.map((child, index) => {
    const hs = healthStatus(child);
    const age = calculateAge(child.dob);
    return `<tr draggable="true" data-child-id="${child.id}" data-index="${index}">
    <td class="drag-handle-cell"><span class="drag-handle" title="Drag to reorder">${icon('gripVertical')}</span></td>
    <td><label class="checkbox"><input type="checkbox" aria-label="Select ${child.name}" data-select-row="${child.id}"><span class="sr-only">Select</span></label></td>
    <td><a class="table-person" href="${pagePath('child-profile')}?id=${child.id}"><span class="table-avatar">${initials(child.name)}</span><div class="table-person__info"><span class="table-person__name" style="display:inline-flex; align-items:center; gap:6px;">${child.name}<button class="icon-button icon-button--small tooltip" data-tooltip="Open in Google Sheets" type="button" aria-label="Open ${child.name}'s Google Sheet" data-open-child-sheet="${child.id}" data-child-name="${child.name}" style="width:22px; height:22px; min-width:22px; padding:2px; border:none; background:transparent; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; opacity:0.85; transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.85'">${icon('googleSheets')}</button></span><span class="table-person__id">${child.id}</span></div></a></td>
    <td data-column="age">${age || '—'}</td><td class="hide-tablet" data-column="gender">${child.gender || '—'}</td><td class="hide-tablet" data-column="blood">${child.blood || '—'}</td><td data-column="status">${healthDot(hs.level)} ${statusBadge(child.status)}</td>
    <td><div class="table-actions"><a class="icon-button icon-button--small tooltip" data-tooltip="View" aria-label="View ${child.name}" href="${pagePath('child-profile')}?id=${child.id}">${icon('eye')}</a><button class="icon-button icon-button--small tooltip" data-tooltip="Edit" type="button" aria-label="Edit ${child.name}" data-edit="${child.id}">${icon('pencil')}</button><button class="icon-button icon-button--small tooltip" data-tooltip="Delete" type="button" aria-label="Delete ${child.name}" data-delete="${child.id}">${icon('trash')}</button></div></td>
  </tr>`;
  }).join('');
}

export function updateChildTable(children) {
  const body = document.querySelector('#child-table-body');
  if (body) body.innerHTML = childRows(children);
  const count = document.querySelector('#child-count');
  if (count) count.textContent = `${children.length} children`;
}
