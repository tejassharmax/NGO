import { updateStudent, getStudent } from './storage.js';

export function collectStudent(form) {
  const values = Object.fromEntries(new FormData(form));
  let id = values.id;
  let admission = values.admissionDate || new Date().toISOString().slice(0, 10);
  let status = 'Active';

  // If there's an existing student with this ID, preserve their admission date, status and other missing fields
  if (id) {
    const existing = getStudent(id);
    if (existing) {
      admission = existing.admission || admission;
      status = existing.status || status;
    }
  } else {
    // Generate new ID
    id = `ST-${String(1025 + Math.floor(Math.random() * 75))}`;
  }

  const mother = values.mother || '';
  const dob = values.dob || values.birthDate || 'Not specified';
  const idNumber = values.idNumber || '';

  return {
    id,
    name: `${values.firstName || 'New'} ${values.lastName || 'Student'}`.trim(),
    email: values.email || 'No email added',
    class: `${values.grade || 'Grade 8'} · ${values.section || 'A'}`,
    gender: values.gender || 'Not specified',
    blood: values.blood || 'Not added',
    father: values.father || 'Not added',
    mother: mother || 'Not added',
    phone: values.phone || 'Not added',
    address: values.address || '',
    notes: values.notes || '',
    admission,
    status,
    dob,
    idNumber
  };
}

export function saveStudent(form) {
  return updateStudent(collectStudent(form));
}
