/**
 * space.js
 * Which kind of space the signed-in account works in, and the words each kind
 * uses on screen.
 *
 * A "home" is a children's home such as Ayusha Nilayam; it is the default and
 * its wording is exactly what the app has always shown. A "family" keeps one
 * family's personal health records. Both store records the same way (a family
 * member is saved like a child record), so only the screens differ.
 *
 * The server sends the type with the Google Sheets config before every render
 * (see fetchSheetsConfig). It is kept for the tab so that anything drawn before
 * that request returns still uses the right words.
 */

const SPACE_TYPE_KEY = 'space-type';

/** @param {string|undefined} type the type sent by the server */
export function rememberSpaceType(type) {
  try {
    sessionStorage.setItem(SPACE_TYPE_KEY, type === 'family' ? 'family' : 'home');
  } catch (e) { }
}

export function forgetSpaceType() {
  try {
    sessionStorage.removeItem(SPACE_TYPE_KEY);
  } catch (e) { }
}

/** @returns {'home'|'family'} */
export function spaceType() {
  try {
    return sessionStorage.getItem(SPACE_TYPE_KEY) === 'family' ? 'family' : 'home';
  } catch (e) {
    return 'home';
  }
}

export function isFamilySpace() {
  return spaceType() === 'family';
}

/**
 * Screen wording that differs between the two kinds of space, as
 * [home, family]. The home text must stay exactly as it was.
 */
const TERMS = {
  // Navigation and page titles
  navHealthSection: ['Children & Health', 'Family & Health'],
  navPeople: ['Children', 'Family members'],
  pageProfile: ['Child Health Profile', 'Health profile'],
  pageRegister: ['Register child', 'Add family member'],
  searchLabel: ['Search child records', 'Search family records'],
  searchPlaceholder: ['Search children, health records…', 'Search family, health records…'],
  workspaceBadge: ['Connected NGO', 'Family space'],

  // One person, several people, everyone
  person: ['Child', 'Family member'],
  personLower: ['child', 'family member'],
  everyone: ['All Children', 'Whole family'],
  selectPerson: ['Select child', 'Select family member'],
  viewPeople: ['View Children', 'View Family'],

  // Global search
  searchCmdRegister: ['Register New Student', 'Add Family Member'],
  searchCmdRegisterHint: ['Enroll child with Aadhaar, parent details & vitals', 'Add someone in the family with their health details'],
  searchCmdCalendar: ['Google Calendar & Health Camps', 'Google Calendar & Appointments'],
  searchEmptyHint: [
    'Try searching by student name, guardian, ID (CH-XXXX), blood group, checkup type, or command.',
    'Try searching by name, relation, blood group, checkup type, or command.'
  ],
  searchIntro: [
    'Type to search students, schedule camps, inspect clinical health records, or run instant commands.',
    'Type to search family members, appointments and health records, or run quick commands.'
  ],
  searchInputPlaceholder: [
    'Search students, health records, appointments, or commands…',
    'Search family members, health records, appointments, or commands…'
  ],
  searchTabPeople: ['Students', 'Family'],
  searchTabAppointments: ['Camps & Appts', 'Appointments'],
  searchBadge: ['Student', 'Member'],
  searchBadgeCaps: ['STUDENT', 'MEMBER'],
  searchProfileLabel: ['Student Profile', 'Health profile'],
  searchContactLabel: ['Guardian Contact', 'Relation'],
  searchTitle: ['Child Health Management Spotlight', 'Family Health Search'],

  // Google Sheets and Calendar
  medicalWorkbook: ['Student Medical Records', 'Medical Records'],
  calendarName: ['Child Health Calendar', 'Family Health Calendar'],
  doctorPlaceholder: ['Doctor who examined the child', 'Doctor who examined them'],
  liveSheetLabel: ['Synced to Live NGO Sheet', 'Synced to your Google Sheet'],
  connectingSheet: ['Connecting to your NGO Google Sheet...', 'Connecting to your Google Sheet...'],
  validatingStage: ['1. Validating child details...', '1. Checking the details...'],
  activeSheetLabel: ['Active NGO Sheet', 'Your Google Sheet'],
  calendarFooter: ['Created from Child Health Management App', 'Created from Ayusha Health'],

  // Messages
  savedToast: ['Child saved & synced', 'Saved & synced'],
  removeConfirm: ['Remove child', 'Remove member'],
  removedToast: ['Child removed', 'Family member removed'],
  removeBody: [
    'This removes the child record from this workspace and automatically updates your connected Google Sheet. This action cannot be undone.',
    'This removes this person from your family space and updates your connected Google Sheet. This action cannot be undone.'
  ],
  uploadForPerson: ['Upload Document for Child', 'Upload a report'],
  uploadDocPlaceholder: ['e.g. Aadhaar Card, Blood Test Report', 'e.g. Blood test report, MRI scan'],
  uploadTitlePlaceholder: ['e.g. Aadhaar Card, Vaccination Certificate, Blood Report', 'e.g. Blood test report, MRI scan, Prescription'],
  choosePerson: ['Choose child', 'Choose family member']
};

/** @param {keyof typeof TERMS} key */
export function term(key) {
  const pair = TERMS[key];
  if (!pair) return key;
  return pair[isFamilySpace() ? 1 : 0];
}

/** How a stored person name is shown; group appointments keep the "All Children" marker. */
export function personLabel(name) {
  return name === 'All Children' ? term('everyone') : name;
}

/** Document categories a family picks from when uploading, as [value, label]. */
export const FAMILY_DOCUMENT_CATEGORIES = [
  ['Lab Report', 'Lab report / Blood test'],
  ['Prescription', 'Prescription'],
  ['Scan', 'Scan / X-ray / MRI'],
  ['Discharge Summary', 'Discharge summary'],
  ['Vaccination Record', 'Vaccination record'],
  ['Insurance', 'Insurance / Policy'],
  ['Other', 'Other']
];

/** The family categories as <option> elements. */
export function familyCategoryOptions() {
  return FAMILY_DOCUMENT_CATEGORIES.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
}

/** Ways someone can be related to the account holder, for the family member form. */
export const RELATIONS = ['Self', 'Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister', 'Grandfather', 'Grandmother', 'Other'];
