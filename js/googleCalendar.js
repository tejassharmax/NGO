/**
 * googleCalendar.js
 * Google Calendar integration for appointment booking & interactive view switcher.
 * Supports Month View, Day View (hourly timeline grid), Interactive Time Slot Pop-up Modal,
 * and seamless Google Calendar event synchronization.
 */

import { getAppointments, addAppointment } from './storage.js';
import { getChildren, calculateAge } from './storage.js';
import { toast } from './toast.js';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const HOURLY_SLOTS = [
  { label: '08:00 AM', value: '08:00' },
  { label: '09:00 AM', value: '09:00' },
  { label: '10:00 AM', value: '10:00' },
  { label: '11:00 AM', value: '11:00' },
  { label: '12:00 PM', value: '12:00' },
  { label: '01:00 PM', value: '13:00' },
  { label: '02:00 PM', value: '14:00' },
  { label: '03:00 PM', value: '15:00' },
  { label: '04:00 PM', value: '16:00' },
  { label: '05:00 PM', value: '17:00' },
  { label: '06:00 PM', value: '18:00' },
  { label: '07:00 PM', value: '19:00' },
  { label: '08:00 PM', value: '20:00' }
];

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

  const dateStr = appointment.date.replace(/-/g, '');
  let startTime = '100000';
  let endTime = '110000';

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
  let hours, minutes = 0;

  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    hours = parseInt(match24[1]);
    minutes = parseInt(match24[2]);
  }

  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    hours = parseInt(match12[1]);
    minutes = parseInt(match12[2]);
    if (match12[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (match12[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
  }

  if (hours === undefined || isNaN(hours)) return null;

  const sh = String(hours).padStart(2, '0');
  const sm = String(minutes).padStart(2, '0');
  const eh = String((hours + 1) % 24).padStart(2, '0');

  return {
    start: `${sh}${sm}00`,
    end: `${eh}${sm}00`
  };
}

/**
 * Create an appointment: save locally + open Google Calendar
 */
export function bookAppointment(data) {
  const appt = addAppointment({
    childId: data.childId,
    childName: data.childName,
    type: data.type,
    date: data.date,
    time: data.time || '10:00',
    doctor: data.doctor || '',
    notes: data.notes || '',
    status: 'Upcoming'
  });

  const calUrl = buildGoogleCalendarUrl(appt);
  window.open(calUrl, '_blank');

  toast('Appointment Booked', `${data.childName} — ${data.type} on ${data.date}. Google Calendar opened.`);
  return appt;
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function typeColor(type) {
  if (!type) return 'blue';
  const t = type.toLowerCase();
  if (t.includes('doctor') || t.includes('general')) return 'blue';
  if (t.includes('follow') || t.includes('vaccin')) return 'green';
  if (t.includes('dental') || t.includes('eye')) return 'amber';
  if (t.includes('deworm')) return 'violet';
  return 'blue';
}

/* ═══════════════════════════════════════════════════════
   MONTH VIEW GRID
   ═══════════════════════════════════════════════════════ */

export function renderCalendarGrid(year, month, selectedDay = null) {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfWeek(year, month);

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

  let headerHTML = DAY_LABELS.map(d => `<div class="cal-header-cell">${d}</div>`).join('');
  let cellsHTML = '';
  for (let i = 0; i < startDay; i++) {
    cellsHTML += `<div class="cal-day cal-day--empty"></div>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    const isToday = isCurrentMonth && day === todayDate;
    const isSelected = selectedDay === day;
    const hasAppts = apptsByDay[day] && apptsByDay[day].length > 0;
    const apptCount = hasAppts ? apptsByDay[day].length : 0;

    let dotsHTML = '';
    if (hasAppts) {
      const types = [...new Set(apptsByDay[day].map(a => a.type))];
      dotsHTML = types.slice(0, 3).map(t => `<span class="cal-dot cal-dot--${typeColor(t)}"></span>`).join('');
    }

    cellsHTML += `
      <button class="cal-day ${isToday ? 'cal-day--today' : ''} ${isSelected ? 'cal-day--selected' : ''} ${hasAppts ? 'cal-day--has-events' : ''}"
        type="button" data-calendar-day="${day}" title="${hasAppts ? apptCount + ' appointment(s)' : 'Click to view Day schedule'}">
        <span class="cal-day__num">${day}</span>
        ${dotsHTML ? `<div class="cal-dots">${dotsHTML}</div>` : ''}
      </button>`;
  }

  return `
    <div class="cal-widget">
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

/* ═══════════════════════════════════════════════════════
   DAY VIEW HOURLY GRID (Google Calendar Style)
   ═══════════════════════════════════════════════════════ */

export function renderDayView(year, month, day) {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dateObj = new Date(year, month, day);
  const dayName = DAY_NAMES[dateObj.getDay()];
  const dateFormatted = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const appointments = getAppointments().filter(a => a.date === dateStr);

  const slotRows = HOURLY_SLOTS.map(slot => {
    // Find appointments matching this slot hour
    const slotHour = parseInt(slot.value.split(':')[0]);
    const matchingAppts = appointments.filter(a => {
      if (!a.time) return slot.value === '10:00'; // Default unassigned to 10 AM
      const match24 = a.time.match(/^(\d{1,2}):/);
      if (match24) {
        let h = parseInt(match24[1]);
        if (a.time.toLowerCase().includes('pm') && h !== 12) h += 12;
        if (a.time.toLowerCase().includes('am') && h === 12) h = 0;
        return h === slotHour;
      }
      return false;
    });

    let slotContent = '';
    if (matchingAppts.length > 0) {
      slotContent = matchingAppts.map(a => `
        <div class="cal-event-card cal-event-card--${typeColor(a.type)}" data-event-id="${a.id}">
          <div class="cal-event-time">${a.time || slot.label}</div>
          <div class="cal-event-info">
            <b class="cal-event-title">${a.childName}</b>
            <span class="cal-event-sub">${a.type}${a.doctor ? ` — ${a.doctor}` : ''}</span>
          </div>
          <span class="cal-event-status cal-event-status--${a.status === 'Completed' ? 'done' : 'upcoming'}">${a.status || 'Upcoming'}</span>
        </div>
      `).join('');
    } else {
      slotContent = `<div class="cal-slot-placeholder">+ Click to add appointment at ${slot.label}</div>`;
    }

    return `
      <div class="cal-timeline-row" data-open-booking-modal data-slot-date="${dateStr}" data-slot-time="${slot.value}">
        <div class="cal-time-col">
          <span>${slot.label}</span>
        </div>
        <div class="cal-slot-col">
          ${slotContent}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="cal-day-view">
      <div class="cal-day-view__header">
        <div class="cal-day-view__title">
          <h3>${dayName}, ${dateFormatted}</h3>
          <p>${appointments.length} appointment(s) scheduled for this day</p>
        </div>
      </div>
      <div class="cal-timeline-grid">
        ${slotRows}
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════
   BOOKING FORM & MODAL
   ═══════════════════════════════════════════════════════ */

export function renderBookingForm(preselectedDate, preselectedTime = '10:00') {
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
          <input class="cal-input" name="time" type="time" value="${preselectedTime}" />
        </label>
      </div>

      <label class="cal-field">
        <span class="cal-field__label">Notes</span>
        <textarea class="cal-textarea" name="notes" rows="2" placeholder="Additional details…"></textarea>
      </label>

      <button class="cal-book-btn" type="submit">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
        Book on Google Calendar
      </button>
    </form>`;
}

/**
 * Render Google Calendar-style Popup Modal
 */
export function renderBookingModalMarkup(dateStr, timeStr) {
  const formHTML = renderBookingForm(dateStr, timeStr);

  return `
    <div class="cal-modal-overlay" id="cal-booking-modal" data-close-cal-modal-bg>
      <div class="cal-modal-card">
        <div class="cal-modal-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
            <h3 style="margin:0; font-size:16px; font-weight:700;">Google Calendar Booking</h3>
          </div>
          <button type="button" class="cal-modal-close" data-close-cal-modal>&times;</button>
        </div>
        <div class="cal-modal-body">
          ${formHTML}
        </div>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════
   FULL CALENDAR CONTAINER & VIEW CONTROLLER
   ═══════════════════════════════════════════════════════ */

export function calendarCard(viewMode = 'month', initialYear, initialMonth, initialDay) {
  const now = new Date();
  const year = initialYear !== undefined ? initialYear : now.getFullYear();
  const month = initialMonth !== undefined ? initialMonth : now.getMonth();
  const day = initialDay !== undefined ? initialDay : now.getDate();

  const isMonthView = viewMode === 'month';
  const monthName = MONTH_NAMES[month];
  const dateObj = new Date(year, month, day);
  const dayName = DAY_NAMES[dateObj.getDay()];

  const titleText = isMonthView ? `${monthName} ${year}` : `${dayName}, ${day} ${monthName} ${year}`;

  return `
    <section class="card cal-card" data-calendar-root data-cal-view-mode="${viewMode}" data-cal-year="${year}" data-cal-month="${month}" data-cal-day="${day}">
      <header class="card__header cal-header-bar">
        <div class="cal-header-left">
          <h2 class="card__title cal-header-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary)"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
            <span data-calendar-title>${titleText}</span>
          </h2>
        </div>

        <div class="cal-header-controls">
          <button class="button button--sm button--ghost" type="button" data-calendar-today>Today</button>
          
          <div class="cal-nav-btn-group">
            <button class="cal-nav-btn" type="button" data-calendar-prev title="Previous">&lsaquo;</button>
            <button class="cal-nav-btn" type="button" data-calendar-next title="Next">&rsaquo;</button>
          </div>

          <div class="cal-view-toggle">
            <button class="cal-view-btn ${isMonthView ? 'active' : ''}" type="button" data-cal-view="month">Month</button>
            <button class="cal-view-btn ${!isMonthView ? 'active' : ''}" type="button" data-cal-view="day">Day</button>
          </div>
        </div>
      </header>

      <div class="card__body cal-card__body">
        <div class="cal-content-container" data-calendar-container>
          ${isMonthView ? renderMonthViewLayout(year, month, day) : renderDayView(year, month, day)}
        </div>
      </div>
    </section>
    <div id="cal-modal-container"></div>`;
}

function renderMonthViewLayout(year, month, day) {
  const now = new Date();
  const dateVal = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return `
    <div class="cal-layout">
      <div class="cal-layout__left">
        ${renderCalendarGrid(year, month, day)}
      </div>
      <div class="cal-layout__right">
        ${renderBookingForm(dateVal)}
      </div>
    </div>`;
}

/**
 * Re-render the calendar view inside root
 */
export function updateCalendarView(root, viewMode, year, month, day) {
  if (!root) return;

  const isMonthView = viewMode === 'month';
  const monthName = MONTH_NAMES[month];
  const dateObj = new Date(year, month, day);
  const dayName = DAY_NAMES[dateObj.getDay()];

  // Update root attributes
  root.dataset.calViewMode = viewMode;
  root.dataset.calYear = year;
  root.dataset.calMonth = month;
  root.dataset.calDay = day;

  // Update title
  const titleEl = root.querySelector('[data-calendar-title]');
  if (titleEl) {
    titleEl.textContent = isMonthView ? `${monthName} ${year}` : `${dayName}, ${day} ${monthName} ${year}`;
  }

  // Update active view buttons
  root.querySelectorAll('[data-cal-view]').forEach(btn => {
    if (btn.dataset.calView === viewMode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update body content
  const container = root.querySelector('[data-calendar-container]');
  if (container) {
    container.innerHTML = isMonthView ? renderMonthViewLayout(year, month, day) : renderDayView(year, month, day);
  }
}

export function getMonthName(month) {
  return MONTH_NAMES[month];
}
