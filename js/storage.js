const KEY = 'sample-students';
const ACTIVITY_KEY = 'sample-activity';
const PENDING_KEY = 'sample-pending-docs';
const DOCS_KEY = 'sample-uploaded-docs';

const seedStudents = [];

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

export function getUploadedDocs() {
  return JSON.parse(localStorage.getItem(DOCS_KEY) || '[]');
}

export function addUploadedDoc(docName, studentName, fileData, status = 'Verified') {
  const docs = getUploadedDocs();
  docs.unshift({
    name: docName,
    student: studentName,
    meta: fileData ? `Image · ${Math.round(fileData.length * 0.75 / 1024)} KB` : 'No file',
    status: status,
    image: fileData,
    timestamp: Date.now()
  });
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}
