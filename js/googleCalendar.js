/**
 * googleCalendar.js
 * Google Calendar integration for appointment booking.
 * Uses Google Calendar URL scheme to create events (no API key required).
 * Manages local appointment state and syncs with the calendar grid UI.
 */

import { getAppointments, addAppointment } from './storage.js';
import { getChildren, calculateAge } from './storage.js';
import { toast } from './toast.js';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Build a Google Calendar event creation URL.
 * Opens Google Calendar in a new tab with pre-filled details.
 */
export function buildGoogleCalendarUrl(appointment) {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';

  const title = encodeURIComponent(`${appointment.childName} — ${appointment.type}`);
  const details = encodeURIComponent(
    `Doctor: ${appointment.doctor || 'N/A'}\nChild: ${appointment.childName}\nType: ${appointment.type}\nNotes: ${appointment.notes || 'No notes'}\n\nCreated from Child Health Management App`
  );

  // Format dates for Google Calendar: YYYYMMDDTHHmmss
  const dateStr = appointment.date.replace(/-/g, '');
  let startTime = '100000'; // default 10:00 AM
  let endTime = '110000';   // default 11:00 AM (1 hour)

  if (appointment.time) {
    const parsed = parseTime(appointment.time);
    if (parsed) {
      startTime = parsed.start;
      endTime = parsed.end;
    }
  }

  const dates = `${dateStr}T${startTime}/${dateStr}T${endTime}`;

  return `${base}&text=${title}&dates=${dates}&details=${details}&sf=true&output=xml`;
}

/**
 * Parse a time string (HH:MM in 24h or 12h) into start/end strings
 */
function parseTime(timeStr) {
  if (!timeStr) return null;
  let hours, minutes;

  // Handle HH:MM format (24h)
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    hours = parseInt(match24[1]);
    minutes = parseInt(match24[2]);
  }

  // Handle 12h format like "10:00 AM"
  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    hours = parseInt(match12[1]);
    minutes = parseInt(match12[2]);
    if (match12[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (match12[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
  }

  if (hours === undefined) return null;

  const sh = String(hours).padStart(2, '0');
  const sm = String(minutes).padStart(2, '0');
  const eh = String(hours + 1).padStart(2, '0');

  return {
    start: `${sh}${sm}00`,
    end: `${eh}${sm}00`
  };
}

/**
 * Create an appointment: save locally + open Google Calendar
 */
export function bookAppointment(data) {
  // Save to local storage
  const appt = addAppointment({
    childId: data.childId,
    childName: data.childName,
    type: data.type,
    date: data.date,
    time: data.time || '',
    doctor: data.doctor || '',
    notes: data.notes || '',
    status: 'Upcoming'
  });

  // Open Google Calendar in new tab
  const calUrl = buildGoogleCalendarUrl(appt);
  window.open(calUrl, '_blank');

  toast('Appointment Booked', `${data.childName} — ${data.type} on ${data.date}. Google Calendar opened.`);
  return appt;
}

/* ═══════════════════════════════════════════════════════
   CALENDAR GRID RENDERING
   ═══════════════════════════════════════════════════════ */

/**
 * Get the number of days in a month
 */
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the day of week (0=Mon, 6=Sun) for the first day of a month
 */
function firstDayOfWeek(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Convert Sun=0 to Mon-based
}

/**
 * Build the calendar grid HTML for a given year/month
 */
export function renderCalendarGrid(year, month, selectedDay = null) {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfWeek(year, month);

  // Get appointments for this month
  const appointments = getAppointments();
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const apptsByDay = {};
  appointments.forEach(a => {
    if (a.date && a.date.startsWith(monthStr)) {
      const day = parseInt(a.date.split('-')[2]);
      if (!apptsByDay[day]) apptsByDay[day] = [];
      apptsByDay[day].push(a);
    }
  });

  // Day headers
  let headerHTML = DAY_LABELS.map(d => `<div class="cal-header-cell">${d}</div>`).join('');

  // Day cells
  let cellsHTML = '';
  // Empty cells before start
  for (let i = 0; i < startDay; i++) {
    cellsHTML += `<div class="cal-day cal-day--empty"></div>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    const isToday = isCurrentMonth && day === todayDate;
    const isSelected = selectedDay === day;
    const hasAppts = apptsByDay[day] && apptsByDay[day].length > 0;
    const apptCount = hasAppts ? apptsByDay[day].length : 0;

    // Determine dot colors based on appointment types
    let dotsHTML = '';
    if (hasAppts) {
      const types = [...new Set(apptsByDay[day].map(a => a.type))];
      dotsHTML = types.slice(0, 3).map(t => `<span class="cal-dot cal-dot--${typeColor(t)}"></span>`).join('');
    }

    cellsHTML += `
      <button class="cal-day ${isToday ? 'cal-day--today' : ''} ${isSelected ? 'cal-day--selected' : ''} ${hasAppts ? 'cal-day--has-events' : ''}"
        type="button" data-calendar-day="${day}" title="${hasAppts ? apptCount + ' appointment(s)' : 'No appointments'}">
        <span class="cal-day__num">${day}</span>
        ${dotsHTML ? `<div class="cal-dots">${dotsHTML}</div>` : ''}
      </button>`;
  }

  return `
    <div class="cal-widget">
      <div class="cal-nav">
        <button class="cal-nav-btn" type="button" data-calendar-prev title="Previous month">&lsaquo;</button>
        <span class="cal-nav-title">${MONTH_NAMES[month]} ${year}</span>
        <button class="cal-nav-btn" type="button" data-calendar-next title="Next month">&rsaquo;</button>
      </div>
      <div class="cal-grid">
        ${headerHTML}
        ${cellsHTML}
      </div>
      <div class="cal-legend">
        <span class="cal-legend-item"><span class="cal-dot cal-dot--blue"></span>Doctor</span>
        <span class="cal-legend-item"><span class="cal-dot cal-dot--green"></span>Follow-up</span>
        <span class="cal-legend-item"><span class="cal-dot cal-dot--amber"></span>Dental</span>
        <span class="cal-legend-item"><span class="cal-dot cal-dot--violet"></span>Deworming</span>
      </div>
    </div>`;
}

/**
 * Render the list of appointments for a selected day
 */
export function renderDayAppointments(year, month, day) {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const appointments = getAppointments().filter(a => a.date === dateStr);
  const dateLabel = new Date(year, month, day).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (appointments.length === 0) {
    return `
      <div class="cal-day-list">
        <div class="cal-day-list__header">${dateLabel}</div>
        <div class="cal-day-list__empty">No appointments scheduled for this day</div>
      </div>`;
  }

  const items = appointments.map(a => `
    <div class="cal-appt-item cal-appt-item--${typeColor(a.type)}">
      <div class="cal-appt-time">${a.time || '—'}</div>
      <div class="cal-appt-details">
        <div class="cal-appt-name">${a.childName}</div>
        <div class="cal-appt-meta">${a.type}${a.doctor ? ` · ${a.doctor}` : ''}</div>
        ${a.notes ? `<div class="cal-appt-notes">${a.notes}</div>` : ''}
      </div>
      <span class="cal-appt-badge cal-appt-badge--${a.status === 'Completed' ? 'done' : 'upcoming'}">${a.status || 'Upcoming'}</span>
    </div>
  `).join('');

  return `
    <div class="cal-day-list">
      <div class="cal-day-list__header">${dateLabel}</div>
      ${items}
    </div>`;
}

/**
 * Render the booking form (child selector + details)
 */
export function renderBookingForm(preselectedDate) {
  const children = getChildren();
  const childOptions = children.map(c => `<option value="${c.id}">${c.name} (${c.id})</option>`).join('');
  const dateVal = preselectedDate || new Date().toISOString().slice(0, 10);

  return `
    <form class="cal-booking-form" id="cal-booking-form">
      <h3 class="cal-booking-title">Book Appointment</h3>

      <label class="cal-field">
        <span class="cal-field__label">Select Child</span>
        <select class="cal-select" name="childId" required>
          <option value="">Choose a child…</option>
          ${childOptions}
        </select>
      </label>

      <label class="cal-field">
        <span class="cal-field__label">Appointment Type</span>
        <select class="cal-select" name="type" required>
          <option value="">Select type…</option>
          <option value="Doctor visit">Doctor Visit</option>
          <option value="Follow-up">Follow-up</option>
          <option value="Dental checkup">Dental Checkup</option>
          <option value="Deworming">Deworming</option>
          <option value="Vaccination">Vaccination</option>
          <option value="Eye checkup">Eye Checkup</option>
          <option value="General checkup">General Checkup</option>
        </select>
      </label>

      <label class="cal-field">
        <span class="cal-field__label">Doctor / Clinic</span>
        <input class="cal-input" name="doctor" type="text" placeholder="e.g. Dr. Amit Kumar" />
      </label>

      <div class="cal-field-row">
        <label class="cal-field">
          <span class="cal-field__label">Date</span>
          <input class="cal-input" name="date" type="date" value="${dateVal}" required />
        </label>
        <label class="cal-field">
          <span class="cal-field__label">Time</span>
          <input class="cal-input" name="time" type="time" value="10:00" />
        </label>
      </div>

      <label class="cal-field">
        <span class="cal-field__label">Notes</span>
        <textarea class="cal-textarea" name="notes" rows="2" placeholder="Additional details…"></textarea>
      </label>

      <button class="cal-book-btn" type="submit" data-book-appointment>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
        Book on Google Calendar
      </button>
    </form>`;
}

/**
 * Map appointment type to a color class
 */
function typeColor(type) {
  if (!type) return 'blue';
  const t = type.toLowerCase();
  if (t.includes('doctor') || t.includes('general')) return 'blue';
  if (t.includes('follow')) return 'green';
  if (t.includes('dental')) return 'amber';
  if (t.includes('deworm')) return 'violet';
  if (t.includes('vaccin')) return 'green';
  if (t.includes('eye')) return 'amber';
  return 'blue';
}

/* ═══════════════════════════════════════════════════════
   FULL CALENDAR SECTION FOR DASHBOARD
   ═══════════════════════════════════════════════════════ */

/**
 * Render the complete calendar card for the dashboard.
 * This replaces the "Active health alerts" section.
 */
export function calendarCard() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  return `
    <section class="card cal-card" data-calendar-root data-cal-year="${year}" data-cal-month="${month}" data-cal-day="${today}">
      <header class="card__header">
        <div>
          <h2 class="card__title" style="display:flex; align-items:center; gap:8px;">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary)"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
            Appointment Calendar
          </h2>
          <p class="card__caption">Select a child and book health appointments — synced to Google Calendar</p>
        </div>
      </header>
      <div class="card__body cal-card__body">
        <div class="cal-layout">
          <div class="cal-layout__left" data-calendar-container>
            ${renderCalendarGrid(year, month, today)}
          </div>
          <div class="cal-layout__right" data-booking-container>
            ${renderBookingForm(now.toISOString().slice(0, 10))}
          </div>
        </div>
        <div class="cal-day-appointments" data-day-appointments>
          ${renderDayAppointments(year, month, today)}
        </div>
      </div>
    </section>`;
}

/**
 * Re-render the calendar grid inside the existing container (for month nav / day selection)
 */
export function updateCalendarView(root, year, month, selectedDay) {
  const calContainer = root.querySelector('[data-calendar-container]');
  const dayContainer = root.querySelector('[data-day-appointments]');
  if (calContainer) calContainer.innerHTML = renderCalendarGrid(year, month, selectedDay);
  if (dayContainer && selectedDay) dayContainer.innerHTML = renderDayAppointments(year, month, selectedDay);

  // Update data attributes
  root.dataset.calYear = year;
  root.dataset.calMonth = month;
  if (selectedDay) root.dataset.calDay = selectedDay;
}

/**
 * Get month name for display
 */
export function getMonthName(month) {
  return MONTH_NAMES[month];
}
