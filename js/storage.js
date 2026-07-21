const KEY = 'orbit-students';
const ACTIVITY_KEY = 'orbit-activity';
const PENDING_KEY = 'orbit-pending-docs';

const seedStudents = [
  { id: 'ST-1024', name: 'Aarav Sharma', email: 'aarav.sharma@orbit.edu', class: 'Grade 8 · A', gender: 'Male', blood: 'B+', father: 'Rohan Sharma', phone: '+91 98221 40393', admission: '2026-07-13', status: 'Active' },
  { id: 'ST-1023', name: 'Ananya Iyer', email: 'ananya.iyer@orbit.edu', class: 'Grade 7 · B', gender: 'Female', blood: 'O+', father: 'S. Iyer', phone: '+91 98304 28013', admission: '2026-07-12', status: 'Active' },
  { id: 'ST-1022', name: 'Vihaan Mehta', email: 'vihaan.mehta@orbit.edu', class: 'Grade 9 · A', gender: 'Male', blood: 'A+', father: 'Arjun Mehta', phone: '+91 99021 12340', admission: '2026-07-12', status: 'Pending' },
  { id: 'ST-1021', name: 'Diya Patel', email: 'diya.patel@orbit.edu', class: 'Grade 6 · C', gender: 'Female', blood: 'AB+', father: 'Kunal Patel', phone: '+91 98188 67521', admission: '2026-07-11', status: 'Active' },
  { id: 'ST-1020', name: 'Kabir Singh', email: 'kabir.singh@orbit.edu', class: 'Grade 8 · B', gender: 'Male', blood: 'O−', father: 'Vikram Singh', phone: '+91 99580 71900', admission: '2026-07-10', status: 'Verified' },
  { id: 'ST-1019', name: 'Mira Nair', email: 'mira.nair@orbit.edu', class: 'Grade 7 · A', gender: 'Female', blood: 'A−', father: 'Arun Nair', phone: '+91 98711 84510', admission: '2026-07-09', status: 'Active' }
];

export function getStudents() {
  const data = localStorage.getItem(KEY);
  if (!data) {
    localStorage.setItem(KEY, JSON.stringify(seedStudents));
    return seedStudents;
  }
  return JSON.parse(data);
}

export function addStudent(student) {
  const students = getStudents();
  students.unshift(student);
  localStorage.setItem(KEY, JSON.stringify(students));
  logActivity('student_added', student.name, 'New student record created');
  return student;
}

export function updateStudent(student) {
  const students = getStudents();
  const idx = students.findIndex(s => s.id === student.id);
  if (idx !== -1) {
    students[idx] = student;
    logActivity('student_updated', student.name, 'Student record updated');
  } else {
    students.unshift(student);
    logActivity('student_added', student.name, 'New student record created');
  }
  localStorage.setItem(KEY, JSON.stringify(students));
  return student;
}

export function deleteStudent(id) {
  const student = getStudents().find(s => s.id === id);
  localStorage.setItem(KEY, JSON.stringify(getStudents().filter((s) => s.id !== id)));
  if (student) {
    logActivity('student_deleted', student.name, 'Student record removed');
  }
}

export function getStudent(id) {
  return getStudents().find((student) => student.id === id) || getStudents()[0];
}

/* ─── activity log ─── */
export function logActivity(type, subject, description) {
  const activities = getActivities();
  activities.unshift({ type, subject, description, timestamp: Date.now() });
  if (activities.length > 50) activities.length = 50;
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
}

export function getActivities() {
  return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
}

export function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export function activityIcon(type) {
  const map = {
    'doc_processed': 'scan',
    'student_added': 'users',
    'student_updated': 'pencil',
    'student_deleted': 'trash',
    'doc_verified': 'check',
    'doc_uploaded': 'upload',
    'export_created': 'download'
  };
  return map[type] || 'clock';
}

export function activityLabel(type) {
  const map = {
    'doc_processed': 'Document processed',
    'student_added': 'New student added',
    'student_updated': 'Profile updated',
    'student_deleted': 'Student removed',
    'doc_verified': 'Record verified',
    'doc_uploaded': 'Document uploaded',
    'export_created': 'Export created'
  };
  return map[type] || 'Activity';
}

/* ─── pending documents ─── */
export function getPendingDocs() {
  return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
}

export function addPendingDoc(docName, studentName) {
  const docs = getPendingDocs();
  docs.unshift({ docName, studentName, timestamp: Date.now() });
  if (docs.length > 20) docs.length = 20;
  localStorage.setItem(PENDING_KEY, JSON.stringify(docs));
}

export function removePendingDoc(index) {
  const docs = getPendingDocs();
  docs.splice(index, 1);
  localStorage.setItem(PENDING_KEY, JSON.stringify(docs));
}
