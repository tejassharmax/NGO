/**
 * googleCalendar.js
 * Google Calendar-grade interactive appointment management.
 * Features full-width Month View with event chips, Day View timeline grid,
 * view toggling, and interactive modal popup with Google Calendar sync.
 */

import { getAppointments, addAppointment } from './storage.js';
import { getChildren, calculateAge } from './storage.js';
import { toast } from './toast.js';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

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
 * Build Google Calendar TEMPLATE URL for instant synchronization
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

  return { start: `${sh}${sm}00`, end: `${eh}${sm}00` };
}

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

  toast('Appointment Scheduled', `${data.childName} — ${data.type} on ${data.date}. Google Calendar synced.`);
  return appt;
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Convert to Monday start
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

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* ═══════════════════════════════════════════════════════
   FULL-WIDTH GOOGLE CALENDAR MONTH GRID WITH EVENT CHIPS
   ═══════════════════════════════════════════════════════ */

export function renderCalendarGrid(year, month, selectedDay = null) {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfWeek(year, month);

  // Previous month trailing days
  const prevMonthTotalDays = daysInMonth(year, month - 1);

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

  // Header row for weekdays
  let headerHTML = DAY_LABELS.map(d => `<div class="gcal-header-cell">${d}</div>`).join('');

  let cellsHTML = '';

  // Render trailing days from previous month
  for (let i = startDay - 1; i >= 0; i--) {
    const prevDayNum = prevMonthTotalDays - i;
    cellsHTML += `
      <div class="gcal-day-cell gcal-day-cell--outside">
        <span class="gcal-day-num">${prevDayNum}</span>
      </div>`;
  }

  // Render current month days
  for (let day = 1; day <= totalDays; day++) {
    const isToday = isCurrentMonth && day === todayDate;
    const isSelected = selectedDay === day;
    const dayAppts = apptsByDay[day] || [];

    // Build event chips inside the calendar day cell
    let chipsHTML = '';
    if (dayAppts.length > 0) {
      const visible = dayAppts.slice(0, 2);
      chipsHTML = visible.map(a => `
        <div class="gcal-event-chip gcal-event-chip--${typeColor(a.type)}" title="${escapeHTML(a.childName)} - ${escapeHTML(a.type)}">
          <span class="gcal-chip-time">${a.time || '10:00'}</span>
          <span class="gcal-chip-title">${escapeHTML(a.childName)}</span>
        </div>
      `).join('');

      if (dayAppts.length > 2) {
        chipsHTML += `<div class="gcal-more-chip">+${dayAppts.length - 2} more</div>`;
      }
    }

    cellsHTML += `
      <div class="gcal-day-cell ${isToday ? 'gcal-day-cell--today' : ''} ${isSelected ? 'gcal-day-cell--selected' : ''}"
        data-calendar-day="${day}" role="button" tabindex="0" title="Click to open Day schedule for ${day} ${MONTH_NAMES[month]}">
        <div class="gcal-day-top">
          <span class="gcal-day-num ${isToday ? 'gcal-day-num--today' : ''}">${day}</span>
        </div>
        <div class="gcal-day-chips">
          ${chipsHTML}
        </div>
      </div>`;
  }

  // Render leading days for next month to complete grid row (total 35 or 42 cells)
  const renderedCount = startDay + totalDays;
  const totalGridCells = renderedCount > 35 ? 42 : 35;
  const nextMonthDays = totalGridCells - renderedCount;

  for (let day = 1; day <= nextMonthDays; day++) {
    cellsHTML += `
      <div class="gcal-day-cell gcal-day-cell--outside">
        <span class="gcal-day-num">${day}</span>
      </div>`;
  }

  return `
    <div class="gcal-month-wrap">
      <div class="gcal-month-grid">
        ${headerHTML}
        ${cellsHTML}
      </div>
      <div class="gcal-legend-bar">
        <span class="gcal-legend-tag"><span class="gcal-dot gcal-dot--blue"></span> Doctor Visit</span>
        <span class="gcal-legend-tag"><span class="gcal-dot gcal-dot--green"></span> Follow-up / Vaccine</span>
        <span class="gcal-legend-tag"><span class="gcal-dot gcal-dot--amber"></span> Dental / Eye</span>
        <span class="gcal-legend-tag"><span class="gcal-dot gcal-dot--violet"></span> Deworming</span>
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
    const slotHour = parseInt(slot.value.split(':')[0]);
    const matchingAppts = appointments.filter(a => {
      if (!a.time) return slot.value === '10:00';
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
        <div class="gcal-event-card gcal-event-card--${typeColor(a.type)}" data-event-id="${a.id}">
          <div class="gcal-event-time-badge">${a.time || slot.label}</div>
          <div class="gcal-event-body">
            <b class="gcal-event-name">${escapeHTML(a.childName)}</b>
            <span class="gcal-event-detail">${escapeHTML(a.type)}${a.doctor ? ` · ${escapeHTML(a.doctor)}` : ''}</span>
          </div>
          <span class="gcal-status-pill gcal-status-pill--${a.status === 'Completed' ? 'done' : 'upcoming'}">${a.status || 'Upcoming'}</span>
        </div>
      `).join('');
    } else {
      slotContent = `<div class="gcal-slot-hint">+ Click to add appointment at ${slot.label}</div>`;
    }

    return `
      <div class="gcal-timeline-row" data-open-booking-modal data-slot-date="${dateStr}" data-slot-time="${slot.value}">
        <div class="gcal-time-col">${slot.label}</div>
        <div class="gcal-slot-col">${slotContent}</div>
      </div>`;
  }).join('');

  return `
    <div class="gcal-day-view">
      <div class="gcal-day-header">
        <div class="gcal-day-title">
          <h3>${dayName}, ${dateFormatted}</h3>
          <p>${appointments.length} appointment(s) scheduled for this day</p>
        </div>
        <button class="button button--primary button--sm" type="button" data-open-booking-modal data-slot-date="${dateStr}" data-slot-time="10:00">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          Add Appointment
        </button>
      </div>
      <div class="gcal-timeline-grid">
        ${slotRows}
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════
   BOOKING FORM & MODAL
   ═══════════════════════════════════════════════════════ */

export function renderBookingForm(preselectedDate, preselectedTime = '10:00') {
  const children = getChildren();
  const childOptions = children.map(c => `<option value="${c.id}">${escapeHTML(c.name)} (${c.id})</option>`).join('');
  const dateVal = preselectedDate || new Date().toISOString().slice(0, 10);

  return `
    <form class="gcal-form" id="cal-booking-form">
      <div class="gcal-form-group">
        <label class="gcal-label">Select Child</label>
        <select class="gcal-input" name="childId" required>
          <option value="">Choose a child…</option>
          ${childOptions}
        </select>
      </div>

      <div class="gcal-form-group">
        <label class="gcal-label">Appointment Type</label>
        <select class="gcal-input" name="type" required>
          <option value="">Select type…</option>
          <option value="Doctor visit">Doctor Visit</option>
          <option value="Follow-up">Follow-up</option>
          <option value="Dental checkup">Dental Checkup</option>
          <option value="Deworming">Deworming</option>
          <option value="Vaccination">Vaccination</option>
          <option value="Eye checkup">Eye Checkup</option>
          <option value="General checkup">General Checkup</option>
        </select>
      </div>

      <div class="gcal-form-group">
        <label class="gcal-label">Doctor / Clinic Name</label>
        <input class="gcal-input" name="doctor" type="text" placeholder="e.g. Dr. Amit Kumar (Pediatrician)" />
      </div>

      <div class="gcal-form-row">
        <div class="gcal-form-group">
          <label class="gcal-label">Date</label>
          <input class="gcal-input" name="date" type="date" value="${dateVal}" required />
        </div>
        <div class="gcal-form-group">
          <label class="gcal-label">Time</label>
          <input class="gcal-input" name="time" type="time" value="${preselectedTime}" />
        </div>
      </div>

      <div class="gcal-form-group">
        <label class="gcal-label">Notes & Instructions</label>
        <textarea class="gcal-textarea" name="notes" rows="2" placeholder="Blood test follow-up, dosage notes…"></textarea>
      </div>

      <button class="gcal-submit-btn" type="submit">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
        Book on Google Calendar
      </button>
    </form>`;
}

export function renderBookingModalMarkup(dateStr, timeStr) {
  const formHTML = renderBookingForm(dateStr, timeStr);

  return `
    <div class="cal-modal-overlay" id="cal-booking-modal" data-close-cal-modal-bg>
      <div class="cal-modal-card">
        <div class="cal-modal-header">
          <div class="gcal-modal-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2563eb" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
            <span>Book Child Appointment</span>
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
  const dateVal = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return `
    <section class="card cal-card" data-calendar-root data-cal-view-mode="${viewMode}" data-cal-year="${year}" data-cal-month="${month}" data-cal-day="${day}">
      <header class="card__header gcal-header">
        <div class="gcal-header-left">
          <div class="gcal-brand-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#2563eb" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
          </div>
          <h2 class="gcal-title" data-calendar-title>${titleText}</h2>
        </div>

        <div class="gcal-header-right">
          <button class="gcal-btn gcal-btn--create" type="button" data-open-booking-modal data-slot-date="${dateVal}" data-slot-time="10:00">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Book Appointment
          </button>

          <button class="gcal-btn gcal-btn--secondary" type="button" data-calendar-today>Today</button>
          
          <div class="gcal-nav-group">
            <button class="gcal-nav-btn" type="button" data-calendar-prev title="Previous">&lsaquo;</button>
            <button class="gcal-nav-btn" type="button" data-calendar-next title="Next">&rsaquo;</button>
          </div>

          <div class="gcal-toggle-group">
            <button class="gcal-toggle-btn ${isMonthView ? 'active' : ''}" type="button" data-cal-view="month">Month</button>
            <button class="gcal-toggle-btn ${!isMonthView ? 'active' : ''}" type="button" data-cal-view="day">Day</button>
          </div>
        </div>
      </header>

      <div class="card__body gcal-body">
        <div class="gcal-container" data-calendar-container>
          ${isMonthView ? renderCalendarGrid(year, month, day) : renderDayView(year, month, day)}
        </div>
      </div>
    </section>
    <div id="cal-modal-container"></div>`;
}

export function updateCalendarView(root, viewMode, year, month, day) {
  if (!root) return;

  const isMonthView = viewMode === 'month';
  const monthName = MONTH_NAMES[month];
  const dateObj = new Date(year, month, day);
  const dayName = DAY_NAMES[dateObj.getDay()];

  root.dataset.calViewMode = viewMode;
  root.dataset.calYear = year;
  root.dataset.calMonth = month;
  root.dataset.calDay = day;

  const titleEl = root.querySelector('[data-calendar-title]');
  if (titleEl) {
    titleEl.textContent = isMonthView ? `${monthName} ${year}` : `${dayName}, ${day} ${monthName} ${year}`;
  }

  root.querySelectorAll('[data-cal-view]').forEach(btn => {
    if (btn.dataset.calView === viewMode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const container = root.querySelector('[data-calendar-container]');
  if (container) {
    container.innerHTML = isMonthView ? renderCalendarGrid(year, month, day) : renderDayView(year, month, day);
  }
}

export function getMonthName(month) {
  return MONTH_NAMES[month];
}
