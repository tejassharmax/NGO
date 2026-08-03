import { updateChild, getChild } from './storage.js';
import { autoSyncChildToGoogleSheets } from './googleSheetsSync.js';
import { autoSyncToGoogleDocs } from './googleDocsSync.js';

export function collectChild(form) {
  const values = Object.fromEntries(new FormData(form));
  let id = values.id;
  let registeredDate = values.registeredDate || new Date().toISOString().slice(0, 10);
  let status = 'Active';

  // If editing, preserve existing registration date and status
  if (id) {
    const existing = getChild(id);
    if (existing) {
      registeredDate = existing.registeredDate || registeredDate;
      status = existing.status || status;
    }
  } else {
    id = `CH-${String(1025 + Math.floor(Math.random() * 9975)).padStart(4, '0')}`;
  }

  const mother = values.mother || '';
  const dob = values.dob || values.birthDate || '';
  const idNumber = values.idNumber || '';

  return {
    id,
    name: `${values.firstName || 'New'} ${values.lastName || 'Child'}`.trim(),
    email: values.email || '',
    gender: values.gender || '',
    blood: values.blood || '',
    father: values.father || '',
    mother: mother || '',
    phone: values.phone || '',
    address: values.address || '',
    notes: values.notes || '',
    registeredDate,
    status,
    dob,
    idNumber,
    // Health baseline fields
    height: values.height ? String(values.height).replace(/[^0-9.]/g, '').trim() : '',
    weight: values.weight ? String(values.weight).replace(/[^0-9.]/g, '').trim() : '',
    medicalConditions: values.medicalConditions || '',
    allergies: values.allergies || '',
    medications: values.medications || '',
    dentalRemarks: values.dentalRemarks || '',
    hygieneIndex: values.hygieneIndex || '',
    emergencyContact: values.emergencyContact || '',
    emergencyPhone: values.emergencyPhone || '',
    hospitalName: values.hospitalName || ''
  };
}

export function saveChild(form) {
  const child = collectChild(form);
  const updated = updateChild(child);
  // Automatically generate / append row to Google Sheets & update Google Docs in user's account
  autoSyncChildToGoogleSheets(child);
  autoSyncToGoogleDocs();
  return updated;
}
