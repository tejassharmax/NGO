import { updateChild, getChild, getChildren } from './storage.js';
import { autoSyncChildToGoogleSheets } from './googleSheetsSync.js';
import { autoSyncToGoogleDocs } from './googleDocsSync.js';
import { toast } from './toast.js';

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
    // Generate a unique ID by checking existing children. The old Math.random()
    // approach had a birthday-paradox collision probability ~50% around a few
    // hundred children; this loop ensures global uniqueness within the dataset.
    const existingIds = new Set((getChildren() || []).map(c => c?.id).filter(Boolean));
    let attempts = 0;
    do {
      id = `CH-${String(1000 + Math.floor(Math.random() * 9000)).padStart(4, '0')}`;
      if (++attempts > 50) {
        // Fallback: timestamp-based ID if the random space is exhausted.
        id = `CH-${Date.now().toString().slice(-7)}`;
        break;
      }
    } while (existingIds.has(id));
  }

  const mother = values.mother || '';
  const dob = values.dob || values.birthDate || '';
  const idNumber = values.idNumber || '';
  const fullName = values.name || `${values.firstName || ''} ${values.lastName || ''}`.trim() || 'Unnamed Child';

  return {
    id,
    name: fullName,
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
  const values = Object.fromEntries(new FormData(form));
  const fullName = (values.name || `${values.firstName || ''} ${values.lastName || ''}`).trim().toLowerCase();
  const dob = (values.dob || values.birthDate || '').trim();

  // Deduplication Check: Same First Name, Last Name / Full Name AND Date of Birth
  const existingChildren = getChildren() || [];
  const isEditing = !!values.id;

  const duplicate = existingChildren.find(c => {
    if (!c) return false;
    if (values.id && c.id === values.id) return false;

    const cNameClean = (c.name || '').trim().toLowerCase();
    const cDobClean = (c.dob || '').trim();

    // Exact match only. The old substring check merged distinct children: "Anna Lee"
    // matched "Savannah Leeds" because both contained "anna" and "lee" as substrings.
    const nameMatches = cNameClean === fullName;
    const dobMatches = dob && cDobClean && dob === cDobClean;

    return nameMatches && dobMatches;
  });

  if (duplicate && !isEditing) {
    let idInput = form.querySelector('input[name="id"]');
    if (!idInput) {
      idInput = document.createElement('input');
      idInput.type = 'hidden';
      idInput.name = 'id';
      idInput.dataset.tempId = 'true';
      form.appendChild(idInput);
    }
    idInput.value = duplicate.id;
    toast('Duplicate prevented', `Updating existing profile for ${duplicate.name} (${duplicate.id}) instead of creating duplicate.`);
  }

  const child = collectChild(form);
  const updated = updateChild(child);

  // Clean up any temporary hidden ID element from form so subsequent submissions start fresh!
  const tempIdInput = form.querySelector('input[data-temp-id="true"]');
  if (tempIdInput) {
    tempIdInput.remove();
  }

  // Automatically generate / append row to Google Sheets & update Google Docs in user's account
  autoSyncChildToGoogleSheets(child);
  autoSyncToGoogleDocs();
  return updated;
}
