import { icon, initials, pagePath, statusBadge } from './utils.js';

export function studentRows(students) {
  if (!students.length) return `<tr><td colspan="7"><div class="empty-state"><span class="empty-state__icon">${icon('users')}</span><h3>No students found</h3><p>Try changing your search or create a new student record.</p></div></td></tr>`;
  return students.map((student) => `<tr>
    <td><label class="checkbox"><input type="checkbox" aria-label="Select ${student.name}" data-select-row="${student.id}"><span class="sr-only">Select</span></label></td>
    <td><a class="table-person" href="${pagePath('student-profile')}?id=${student.id}"><span class="table-avatar">${initials(student.name)}</span><span><b>${student.name}</b><span>${student.id}</span></span></a></td>
    <td>${student.class}</td><td class="hide-tablet">${student.gender}</td><td class="hide-tablet">${student.blood}</td><td>${statusBadge(student.status)}</td>
    <td><div class="table-actions"><a class="icon-button icon-button--small tooltip" data-tooltip="View" aria-label="View ${student.name}" href="${pagePath('student-profile')}?id=${student.id}">${icon('eye')}</a><button class="icon-button icon-button--small tooltip" data-tooltip="Edit" type="button" aria-label="Edit ${student.name}" data-edit="${student.id}">${icon('pencil')}</button><button class="icon-button icon-button--small tooltip" data-tooltip="Delete" type="button" aria-label="Delete ${student.name}" data-delete="${student.id}">${icon('trash')}</button></div></td>
  </tr>`).join('');
}

export function updateStudentTable(students) {
  const body = document.querySelector('#student-table-body');
  if (body) body.innerHTML = studentRows(students);
  const count = document.querySelector('#student-count');
  if (count) count.textContent = `${students.length} students`;
}
