import { icon, initials, pagePath, statusBadge, healthDot } from './utils.js';
import { healthStatus, calculateAge } from './storage.js';

export const DEFAULT_COLUMN_ORDER = ['child', 'age', 'gender', 'blood', 'status'];

export function getColumnOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem('chm-col-order'));
    if (Array.isArray(saved) && saved.length === DEFAULT_COLUMN_ORDER.length && DEFAULT_COLUMN_ORDER.every(c => saved.includes(c))) {
      return saved;
    }
  } catch (_) {}
  return [...DEFAULT_COLUMN_ORDER];
}

export function setColumnOrder(order) {
  localStorage.setItem('chm-col-order', JSON.stringify(order));
}

export function childTableHeaders() {
  const order = getColumnOrder();
  const headerMap = {
    child: `<th data-resizable data-column="child" class="col-draggable" draggable="true" title="Drag to reorder column"><div class="th-content"><button class="sort-button" type="button" data-sort="name">Child ${icon('chevronDown')}</button><span class="col-drag-grip" title="Drag column">${icon('gripVertical')}</span></div></th>`,
    age: `<th data-resizable data-column="age" class="col-draggable" draggable="true" title="Drag to reorder column"><div class="th-content"><span>Age</span><span class="col-drag-grip" title="Drag column">${icon('gripVertical')}</span></div></th>`,
    gender: `<th class="hide-tablet col-draggable" data-column="gender" draggable="true" title="Drag to reorder column"><div class="th-content"><span>Gender</span><span class="col-drag-grip" title="Drag column">${icon('gripVertical')}</span></div></th>`,
    blood: `<th class="hide-tablet col-draggable" data-column="blood" draggable="true" title="Drag to reorder column"><div class="th-content"><span>Blood group</span><span class="col-drag-grip" title="Drag column">${icon('gripVertical')}</span></div></th>`,
    status: `<th data-column="status" class="col-draggable" draggable="true" title="Drag to reorder column"><div class="th-content"><span>Status</span><span class="col-drag-grip" title="Drag column">${icon('gripVertical')}</span></div></th>`
  };

  const dynamicHeaders = order.map(col => headerMap[col] || '').join('');
  return `<tr>
    <th class="drag-handle-th"><span class="sr-only">Reorder</span></th>
    <th><label class="checkbox"><input id="select-all" type="checkbox" aria-label="Select all children"><span class="sr-only">Select all</span></label></th>
    ${dynamicHeaders}
    <th><span class="sr-only">Actions</span></th>
  </tr>`;
}

export function childRows(children) {
  if (!children.length) return `<tr><td colspan="8"><div class="empty-state"><span class="empty-state__icon">${icon('users')}</span><h3>No children found</h3><p>Try changing your search or register a new child.</p></div></td></tr>`;
  
  const order = getColumnOrder();
  return children.map((child, index) => {
    const hs = healthStatus(child);
    const age = calculateAge(child.dob);

    const cellMap = {
      child: `<td data-column="child"><a class="table-person" href="${pagePath('child-profile')}?id=${child.id}"><span class="table-avatar">${initials(child.name)}</span><div class="table-person__info"><span class="table-person__name" style="display:inline-flex; align-items:center; gap:6px;">${child.name}<button class="icon-button icon-button--small tooltip" data-tooltip="Open in Google Sheets" type="button" aria-label="Open ${child.name}'s Google Sheet" data-open-child-sheet="${child.id}" data-child-name="${child.name}" style="width:22px; height:22px; min-width:22px; padding:2px; border:none; background:transparent; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; opacity:0.85; transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.85'">${icon('googleSheets')}</button></span><span class="table-person__id">${child.id}</span></div></a></td>`,
      age: `<td data-column="age">${age || '—'}</td>`,
      gender: `<td class="hide-tablet" data-column="gender">${child.gender || '—'}</td>`,
      blood: `<td class="hide-tablet" data-column="blood">${child.blood || '—'}</td>`,
      status: `<td data-column="status">${healthDot(hs.level)} ${statusBadge(child.status)}</td>`
    };

    const dynamicCells = order.map(col => cellMap[col] || '').join('');

    return `<tr draggable="true" data-child-id="${child.id}" data-index="${index}">
    <td class="drag-handle-cell"><span class="drag-handle" title="Drag to reorder">${icon('gripVertical')}</span></td>
    <td><label class="checkbox"><input type="checkbox" aria-label="Select ${child.name}" data-select-row="${child.id}"><span class="sr-only">Select</span></label></td>
    ${dynamicCells}
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
