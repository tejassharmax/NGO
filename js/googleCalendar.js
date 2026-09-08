/**
 * googleCalendar.js
 * Google Calendar-grade interactive appointment management.
 * Features full-width Month View with event chips, Day View timeline grid,
 * view toggling, and interactive modal popup with Google Calendar sync.
 */

import { getAppointments, addAppointment } from './storage.js';
import { getChildren, calculateAge, getGrowthRecords, getHealthRecords } from './storage.js';
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

export const DOCTOR_SPECIALTIES = [
  'General Pediatrics',
  'Pediatric Dentistry / Dental',
  'Ophthalmology / Eye Specialist',
  'ENT (Ear, Nose, Throat)',
  'Dermatology / Skin Care',
  'Pediatric Orthopedics',
  'Cardiology',
  'Neurology',
  'Nutrition & Dietetics',
  'Child Psychology / Mental Health',
  'General Physician',
  'Other Speciality'
];

/**
 * Build Google Calendar TEMPLATE URL for instant synchronization
 */
export function buildGoogleCalendarUrl(appointment, isGroupPlan = false, allChildrenList = []) {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';

  let titleStr = '';
  let detailsStr = '';

  if (isGroupPlan || appointment.isGroupPlan || appointment.childId === 'ALL' || appointment.childName === 'All Children') {
    const list = allChildrenList && allChildrenList.length > 0 ? allChildrenList : getChildren();
    const groupCount = list.length;
    const titlePrefix = appointment.doctor ? `${appointment.doctor.trim()} — ` : '';
    titleStr = `${titlePrefix}All Children (${groupCount}) — ${appointment.type}`;

    const childrenNames = list.map((c, i) => `  ${i + 1}. ${c.name} (ID: ${c.id || 'N/A'})`).join('\n');
    detailsStr =
      `📋 GROUP APPOINTMENT: All Children — ${appointment.type}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👥 Target: All Registered Children (${groupCount} Students)\n` +
      `🩺 Doctor / Title: ${appointment.doctor || 'Routine Healthcare Session'}${appointment.specialty ? ` (${appointment.specialty})` : ''}\n` +
      `📅 Date: ${appointment.date}\n` +
      `⏰ Time: ${formatSingleDisplayTime(appointment.time || '10:00')}\n\n` +
      `📋 Children Included in this Plan (${groupCount}):\n${childrenNames}\n\n` +
      `📝 Notes: ${appointment.notes || 'No additional notes'}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Created from Child Health Management App`;
  } else {
    titleStr = `${appointment.childName} — ${appointment.type}`;
    detailsStr =
      `Doctor: ${appointment.doctor || 'N/A'}${appointment.specialty ? ` (${appointment.specialty})` : ''}\n` +
      `Child: ${appointment.childName}\n` +
      `Type: ${appointment.type}\n` +
      `Notes: ${appointment.notes || 'No notes'}\n\n` +
      `Created from Child Health Management App`;
  }

  const title = encodeURIComponent(titleStr);
  const details = encodeURIComponent(detailsStr);

  const dateStr = (appointment.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
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
 * Build Google Tasks & Reminders URL for device notification sync
 */
export function buildGoogleTasksUrl(reminder) {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const title = encodeURIComponent(`🔔 REMINDER: ${reminder.childName} — ${reminder.type || reminder.title || 'Health Task'}`);
  const details = encodeURIComponent(
    `📱 GOOGLE TASKS & DEVICE REMINDER\n` +
    `Child: ${reminder.childName}\n` +
    `Task Type: ${reminder.type || 'Reminder'}\n` +
    `Notes: ${reminder.doctor || reminder.notes || 'Healthcare Task'}\n\n` +
    `⚠️ Sync Notice: Notification alert will ring on all connected devices signed into your Google Account (Android, iOS, PC, Mac).`
  );

  const dateStr = (reminder.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  let startTime = '100000';
  let endTime = '103000';

  if (reminder.time) {
    const parsed = parseTime(reminder.time);
    if (parsed) {
      startTime = parsed.start;
      endTime = parsed.end;
    }
  }

  const dates = `${dateStr}T${startTime}/${dateStr}T${endTime}`;
  return `${base}&text=${title}&dates=${dates}&details=${details}&remind=true&sf=true&output=xml`;
}

export function parseHoursAndMinutes(timeStr) {
  if (!timeStr) return { hours: 10, minutes: 0 };
  const str = String(timeStr).trim();

  // Try 12-hour format e.g. "11:30 AM", "11:30AM", "11:30 PM", "9:00 AM"
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const ampm = match12[3] ? match12[3].toUpperCase() : null;
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return { hours: isNaN(hours) ? 10 : hours, minutes: isNaN(minutes) ? 0 : minutes };
  }

  const parts = str.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return {
    hours: isNaN(hours) ? 10 : hours,
    minutes: isNaN(minutes) ? 0 : minutes
  };
}

export function formatSingleDisplayTime(timeStr) {
  const { hours, minutes } = parseHoursAndMinutes(timeStr);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  const minStr = String(minutes).padStart(2, '0');
  return `${h12}:${minStr} ${ampm}`;
}

export function formatDisplayTimeRange(timeStr) {
  const { hours, minutes } = parseHoursAndMinutes(timeStr);
  const ampm = hours >= 12 ? 'pm' : 'am';
  const h12 = hours % 12 || 12;
  const minStr = String(minutes).padStart(2, '0');
  const startFormatted = `${h12}:${minStr}`;

  const endHours = (hours + 1) % 24;
  const endAmpm = endHours >= 12 ? 'pm' : 'am';
  const endH12 = endHours % 12 || 12;
  const endFormatted = `${endH12}:${minStr}${endAmpm}`;

  return `${startFormatted} – ${endFormatted}`;
}

function parseTime(timeStr) {
  if (!timeStr) return null;
  const { hours, minutes } = parseHoursAndMinutes(timeStr);
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
    specialty: data.specialty || '',
    date: data.date,
    time: data.time || '10:00',
    doctor: data.doctor || '',
    notes: data.notes || '',
    status: 'Upcoming'
  });

  if (!data.isBulk || data.openCal) {
    const calUrl = buildGoogleCalendarUrl(appt);
    window.open(calUrl, '_blank');
  }

  if (!data.isBulk) {
    toast('Appointment Scheduled', `${data.childName} — ${data.type} on ${data.date}. Google Calendar synced.`);
  }
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
  if (t.includes('doctor') || t.includes('general') || t.includes('monthly')) return 'blue';
  if (t.includes('follow') || t.includes('vaccin')) return 'green';
  if (t.includes('dental') || t.includes('oral') || t.includes('eye')) return 'amber';
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
        <div class="gcal-event-chip gcal-event-chip--${typeColor(a.type)}" data-event-id="${a.id}" title="${escapeHTML(a.childName)} - ${escapeHTML(a.type)}">
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
        <span class="gcal-legend-tag"><span class="gcal-dot gcal-dot--blue"></span> Doctor Visit / Monthly</span>
        <span class="gcal-legend-tag"><span class="gcal-dot gcal-dot--green"></span> Follow-up / Vaccine</span>
        <span class="gcal-legend-tag"><span class="gcal-dot gcal-dot--amber"></span> Dental / Oral</span>
        <span class="gcal-legend-tag"><span class="gcal-dot gcal-dot--violet"></span> Deworming</span>
      </div>
    </div>`;
}

export function computeAppointmentStatus(appt) {
  if (!appt) return 'Upcoming';
  if (appt.status && appt.status !== 'Upcoming' && appt.status !== 'Pending') {
    return appt.status;
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  if (appt.date < todayStr) {
    return 'Completed';
  }
  if (appt.date === todayStr) {
    const { hours } = parseHoursAndMinutes(appt.time || '10:00');
    const currentHour = new Date().getHours();
    if (hours < currentHour) {
      return 'Completed';
    }
  }
  return 'Upcoming';
}

/* ═══════════════════════════════════════════════════════
   DAY VIEW HOURLY GRID (Google Calendar Style)
   ═══════════════════════════════════════════════════════ */

export function renderDayView(year, month, day) {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const appointments = getAppointments().filter(a => a.date === dateStr);

  const slotRows = HOURLY_SLOTS.map(slot => {
    const slotHour = parseInt(slot.value.split(':')[0], 10);
    const matchingAppts = appointments.filter(a => {
      if (!a.time) return slot.value === '10:00';
      const { hours } = parseHoursAndMinutes(a.time);
      return hours === slotHour;
    });

    let slotContent = '';
    if (matchingAppts.length > 0) {
      slotContent = matchingAppts.map(a => {
        const currentStatus = computeAppointmentStatus(a);
        return `
          <div class="gcal-event-card gcal-event-card--${typeColor(a.type)}" data-event-id="${a.id}">
            <div class="gcal-event-card-main">
              <div class="gcal-event-title-row">
                <span class="gcal-event-name">${escapeHTML(a.childName)}</span>
                <span class="gcal-event-dot">·</span>
                <span class="gcal-event-detail-text">${escapeHTML(a.type)}${a.doctor ? ` (${escapeHTML(a.doctor)})` : ''}</span>
              </div>
              <div class="gcal-event-time-row">${formatSingleDisplayTime(a.time || slot.label)}</div>
            </div>
            <span class="gcal-status-pill gcal-status-pill--${currentStatus === 'Completed' ? 'done' : 'upcoming'}">${currentStatus}</span>
          </div>`;
      }).join('');
    } else {
      slotContent = `<div class="gcal-slot-hint">+ Add appointment at ${slot.label}</div>`;
    }

    return `
      <div class="gcal-timeline-row" data-open-booking-modal data-slot-date="${dateStr}" data-slot-time="${slot.value}">
        <div class="gcal-time-col">${slot.label}</div>
        <div class="gcal-slot-col">${slotContent}</div>
      </div>`;
  }).join('');

  return `
    <div class="gcal-day-view">
      <div class="gcal-timeline-grid">
        ${slotRows}
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════
   BOOKING FORM & MODAL — Google Calendar Style Popup
   ═══════════════════════════════════════════════════════ */

export function renderBookingForm(preselectedDate, preselectedTime = '10:00') {
  const children = getChildren();
  const childOptions = children.map(c => `<option value="${c.id}">${escapeHTML(c.name)} (${c.id})</option>`).join('');
  const specialtyOptions = DOCTOR_SPECIALTIES.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join('');
  const dateVal = preselectedDate || new Date().toISOString().slice(0, 10);

  // Format display date
  const dateObj = new Date(dateVal + 'T00:00:00');
  const displayDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Format display time
  const displayTime = formatSingleDisplayTime(preselectedTime);

  return `
    <form class="gcal-popup-form" id="cal-booking-form">
      <!-- Title row (Google Calendar style borderless input) -->
      <div class="gcal-popup-title-row">
        <input class="gcal-popup-title-input" name="doctor" type="text" placeholder="Add title" autocomplete="off" />
      </div>

      <!-- Icon rows -->
      <div class="gcal-popup-rows">
        <!-- Date & Time -->
        <div class="gcal-popup-row">
          <div class="gcal-popup-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div class="gcal-popup-row-content">
            <div class="gcal-popup-datetime">
              <input class="gcal-popup-date-input" name="date" type="date" value="${dateVal}" required />
              <input class="gcal-popup-time-input" name="time" type="time" value="${preselectedTime}" />
            </div>
            <div class="gcal-popup-date-display">${displayDate} · ${displayTime}</div>
          </div>
        </div>

        <!-- Child selector with All Children toggle pill -->
        <div class="gcal-popup-row">
          <div class="gcal-popup-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div class="gcal-popup-row-content" style="display: flex; align-items: center; gap: 8px; width: 100%;">
            <select class="gcal-popup-select" name="childId" id="cal-child-select" required style="flex: 1; min-width: 0;">
              <option value="">Select child</option>
              <option value="ALL">All Children (${children.length})</option>
              ${childOptions}
            </select>
            <label class="gcal-all-pill" id="cal-all-pill" title="Toggle all ${children.length} registered children" role="button" aria-pressed="false" tabindex="0">
              <input type="checkbox" id="cal-all-children-check" name="selectAllChildren" value="true" />
              <svg class="gcal-all-pill-check" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" style="display:none; flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>
              <svg class="gcal-all-pill-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>All Children</span>
            </label>
          </div>
        </div>

        <!-- Appointment type -->
        <div class="gcal-popup-row">
          <div class="gcal-popup-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div class="gcal-popup-row-content">
            <select class="gcal-popup-select" name="type" required>
              <option value="">Appointment type</option>
              <option value="Doctor visit">Doctor Visit</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Dental checkup">Dental Checkup</option>
              <option value="Deworming">Deworming</option>
              <option value="Vaccination">Vaccination</option>
              <option value="Monthly checkup">Monthly Checkup</option>
              <option value="Oral checkup">Oral Checkup</option>
            </select>
          </div>
        </div>

        <!-- Speciality of doctor (Optional, can be empty) -->
        <div class="gcal-popup-row">
          <div class="gcal-popup-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
          </div>
          <div class="gcal-popup-row-content">
            <select class="gcal-popup-select" name="specialty" id="cal-specialty-select">
              <option value="">Speciality of doctor</option>
              ${specialtyOptions}
            </select>
          </div>
        </div>

        <!-- Notes -->
        <div class="gcal-popup-row">
          <div class="gcal-popup-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
          </div>
          <div class="gcal-popup-row-content">
            <textarea class="gcal-popup-notes" name="notes" rows="2" placeholder="Add description or notes"></textarea>
          </div>
        </div>

        <!-- Google Calendar badge -->
        <div class="gcal-popup-row">
          <div class="gcal-popup-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
          </div>
          <div class="gcal-popup-row-content">
            <span class="gcal-popup-cal-label">
              <span class="gcal-popup-cal-dot"></span>
              Child Health Calendar
            </span>
          </div>
        </div>
      </div>

      <!-- Footer buttons -->
      <div class="gcal-popup-footer">
        <button class="gcal-popup-more-btn" type="button" data-toggle-cal-more>More options</button>
        <button class="gcal-popup-save-btn" type="submit">Save</button>
      </div>
    </form>`;
}

export function renderBookingModalMarkup(dateStr, timeStr) {
  const formHTML = renderBookingForm(dateStr, timeStr);

  return `
    <div class="gcal-popup-backdrop" id="cal-booking-modal" data-close-cal-modal-bg role="presentation">
      <div class="gcal-popup-card" role="dialog" aria-modal="true">
        <button class="gcal-popup-close" type="button" aria-label="Close" data-close-cal-modal>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        ${formHTML}
      </div>
    </div>`;
}

export function renderEventDetailsModalMarkup(eventId) {
  const appointments = getAppointments();
  const appt = appointments.find(a => String(a.id) === String(eventId));
  if (!appt) return '';

  const currentStatus = computeAppointmentStatus(appt);
  const dateObj = new Date(appt.date + 'T00:00:00');
  const dayStr = !isNaN(dateObj) ? dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : appt.date;
  const timeRangeFormatted = formatDisplayTimeRange(appt.time || '10:00 AM');

  const hexColors = {
    blue: '#2563eb',
    green: '#16a34a',
    amber: '#ea580c',
    violet: '#9333ea'
  };
  const colorHex = hexColors[typeColor(appt.type)] || '#2563eb';

  return `
    <div class="gcal-popup-backdrop" id="cal-booking-modal" data-close-cal-modal-bg role="presentation">
      <div class="gcal-event-popover-card" role="dialog" aria-modal="true">
        <!-- Banner Header with Aesthetic Image -->
        <div class="gcal-popover-banner" style="background-image: url('assets/gcal_event_banner.png');">
          <div class="gcal-popover-banner-overlay"></div>
          <div class="gcal-popover-actions">
            <button class="gcal-popover-btn gcal-popover-btn--edit" type="button" data-edit-event-id="${appt.id}" title="Edit appointment">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" style="pointer-events:none;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="gcal-popover-btn gcal-popover-btn--delete" type="button" data-delete-event-id="${appt.id}" title="Delete appointment">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" style="pointer-events:none;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
            <button class="gcal-popover-btn gcal-popover-btn--sync" type="button" data-sync-event-id="${appt.id}" title="Open in Google Calendar">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" style="pointer-events:none;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </button>
            <button class="gcal-popover-btn gcal-popover-btn--close" type="button" data-close-cal-modal title="Close">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" style="pointer-events:none;"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- Details Body -->
        <div class="gcal-popover-body">
          <!-- Title row -->
          <div class="gcal-popover-header-block">
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                  <span class="gcal-popover-color-dot" style="background-color: ${colorHex};"></span>
                  <span class="gcal-event-chip gcal-event-chip--${typeColor(appt.type)}" style="font-size:12px; font-weight:700; padding:3px 10px; border-radius:12px; display:inline-flex;">
                    ${escapeHTML(appt.type || 'Appointment')}
                  </span>
                  ${appt.childId ? `<span style="font-size:11px; font-weight:600; color:var(--color-text-muted); background:var(--color-bg-alt, #f1f5f9); padding:2px 8px; border-radius:10px;">ID: ${appt.childId}</span>` : ''}
                </div>
                <h2 class="gcal-popover-title" style="font-size:20px; font-weight:700; color:var(--color-text); margin:0; line-height:1.3;">${escapeHTML(appt.childName)}</h2>
              </div>
              <span class="gcal-status-pill gcal-status-pill--${currentStatus.toLowerCase() === 'completed' ? 'done' : 'upcoming'}" style="font-size:11px; font-weight:700; padding:4px 12px; border-radius:14px; white-space:nowrap;">
                ${currentStatus.toUpperCase()}
              </span>
            </div>
            <div class="gcal-popover-time" style="margin-top:8px; display:flex; align-items:center; gap:6px; font-size:13px; color:var(--color-text-muted); font-weight:500;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>${dayStr} · ${timeRangeFormatted}</span>
            </div>
          </div>

          <!-- Doctor & Info Cards -->
          <div class="gcal-popover-info-grid">
            <div class="gcal-popover-info-item">
              <div class="gcal-popover-info-icon">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#2563eb" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div class="gcal-popover-info-text">
                <span class="gcal-popover-info-label">Doctor / Title</span>
                <span class="gcal-popover-info-val">${escapeHTML(appt.doctor || 'Routine Healthcare')}${appt.specialty ? ` <span style="font-size:12px; opacity:0.85; font-weight:500;">(${escapeHTML(appt.specialty)})</span>` : ''}</span>
              </div>
            </div>

            <div class="gcal-popover-info-item">
              <div class="gcal-popover-info-icon">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#16a34a" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <div class="gcal-popover-info-text">
                <span class="gcal-popover-info-label">Notification</span>
                <span class="gcal-popover-info-val">30 mins before</span>
              </div>
            </div>
          </div>

          <!-- Notes Card with Dedicated Inline Edit -->
          <div class="gcal-popover-notes-card">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
              <div style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:0.04em;">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                Clinical Notes
              </div>
              <button class="gcal-notes-inline-edit-btn" id="notes-btn-${appt.id}" type="button" data-toggle-notes-edit="${appt.id}" title="Edit clinical notes" style="display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; color:#1a73e8; background:transparent; border:none; cursor:pointer; padding:2px 6px; border-radius:4px; transition:background 0.15s;">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span>Edit</span>
              </button>
            </div>
            <div class="gcal-notes-view-mode" id="notes-view-${appt.id}" style="font-size:13px; color:var(--color-text); line-height:1.5; white-space:pre-wrap;">${escapeHTML(appt.notes || 'No specific clinical instructions provided.')}</div>
            <div class="gcal-notes-edit-mode" id="notes-edit-${appt.id}" style="display:none; margin-top:6px;">
              <textarea class="gcal-popup-notes" id="notes-input-${appt.id}" rows="3" style="width:100%; font-size:13px; padding:8px 10px; border:1px solid #1a73e8; border-radius:6px; outline:none; resize:vertical; font-family:inherit; background:var(--color-surface, #fff); color:var(--color-text);" placeholder="Type clinical notes...">${escapeHTML(appt.notes || '')}</textarea>
              <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:8px;">
                <button type="button" class="button button--secondary button--sm" data-cancel-notes-edit="${appt.id}" style="padding:4px 10px; font-size:11px;">Cancel</button>
                <button type="button" class="button button--primary button--sm" data-save-notes-inline="${appt.id}" style="padding:4px 12px; font-size:11px; gap:4px;">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Save Notes
                </button>
              </div>
            </div>
          </div>

          <!-- Dual Action Footer -->
          <div class="gcal-popover-footer-dual">
            <button class="gcal-btn gcal-btn--secondary" type="button" data-open-clinical-modal="${appt.id}" style="flex:1; justify-content:center; gap:6px; font-size:13px; padding:8px 14px;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit details
            </button>
            <button class="gcal-btn gcal-btn--create" type="button" data-sync-event-id="${appt.id}" style="flex:1.4; justify-content:center; gap:6px; font-size:13px; padding:8px 14px;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
              Open in Google Calendar
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

/**
 * Render Clinical Vitals & Blood Test Report Data Entry Modal
 * Exactly matches the NGO Google Sheet Child Tab format:
 * - Row 3: DATE, TEMP(F), B/P, WEIGHT, P/R, SPO2, COMPLAINT, PRESCRIPTION, EYE CHECK UP
 * - Row 19: DATE, HAEMOGLOBIN, WBC, PLATELETS, RBC, PCV, NEUTROPHIL, LYMPHOCYTES, EOSINOPHILS, MONOCYTES, BASOPHILS, RBC MORPHOLOGY, WBC MORPHOLOGY, PLATELETS ADEQUACY
 */
export function renderClinicalSectionsMarkup({ existingGrowth = {}, existingBlood = {}, targetDate = '', prefix = '' } = {}) {
  const dateVal = targetDate || new Date().toISOString().slice(0, 10);
  return `
    <!-- SECTION 1: ROUTINE CLINICAL CHECKUP -->
    <div class="clinical-section-card" style="margin-bottom: 24px;">
      <div class="clinical-section-header">
        <div class="clinical-section-title">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" stroke-width="2.2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          <span>Routine Clinical Checkup</span>
        </div>
        <span class="clinical-sync-badge">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M4 10h16"/><path d="M10 4v16"/></svg>
          Syncs to Sheet Row 3
        </span>
      </div>

      <div class="clinical-grid-3">
        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}checkup-date">DATE</label>
          <input class="clinical-input" id="${prefix}checkup-date" type="date" name="checkup_date" value="${existingGrowth.date || dateVal}" required />
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}checkup-temp">TEMP (F)</label>
          <div class="clinical-input-unit-wrapper">
            <input class="clinical-input" id="${prefix}checkup-temp" type="text" name="temperature" placeholder="98.6" value="${escapeHTML(existingGrowth.temperature || existingGrowth.temp || '')}" />
            <span class="clinical-input-unit">°F</span>
          </div>
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}checkup-bp">B/P</label>
          <input class="clinical-input" id="${prefix}checkup-bp" type="text" name="bp" placeholder="110/70" value="${escapeHTML(existingGrowth.bp || existingGrowth.bloodPressure || '')}" />
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}checkup-weight">WEIGHT</label>
          <div class="clinical-input-unit-wrapper">
            <input class="clinical-input" id="${prefix}checkup-weight" type="number" step="0.1" name="weight" placeholder="32.5" value="${escapeHTML(existingGrowth.weight || '')}" />
            <span class="clinical-input-unit">kg</span>
          </div>
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}checkup-pulse">P/R</label>
          <div class="clinical-input-unit-wrapper">
            <input class="clinical-input" id="${prefix}checkup-pulse" type="number" name="pulse" placeholder="78" value="${escapeHTML(existingGrowth.pulse || existingGrowth.pulseRate || '')}" />
            <span class="clinical-input-unit">bpm</span>
          </div>
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}checkup-spo2">SPO2</label>
          <div class="clinical-input-unit-wrapper">
            <input class="clinical-input" id="${prefix}checkup-spo2" type="number" name="spo2" placeholder="99" value="${escapeHTML(existingGrowth.spo2 || '')}" />
            <span class="clinical-input-unit">%</span>
          </div>
        </div>

        <div class="clinical-field-group clinical-grid-full">
          <label class="clinical-field-label" for="${prefix}checkup-eye">EYE CHECK UP</label>
          <input class="clinical-input" id="${prefix}checkup-eye" type="text" name="eyeCheckup" placeholder="e.g. Normal 6/6, Clear vision" value="${escapeHTML(existingGrowth.eyeCheckup || existingGrowth.eyeRemarks || '')}" />
        </div>

        <div class="clinical-field-group clinical-grid-full">
          <label class="clinical-field-label" for="${prefix}checkup-complaint">COMPLAINT</label>
          <textarea class="clinical-textarea" id="${prefix}checkup-complaint" name="complaint" rows="2" placeholder="Presenting complaint or symptoms...">${escapeHTML(existingGrowth.complaint || existingGrowth.symptoms || '')}</textarea>
        </div>

        <div class="clinical-field-group clinical-grid-full">
          <label class="clinical-field-label" for="${prefix}checkup-prescription">PRESCRIPTION</label>
          <textarea class="clinical-textarea" id="${prefix}checkup-prescription" name="prescription" rows="2" placeholder="Prescription, medicines advised, treatment given...">${escapeHTML(existingGrowth.prescription || existingGrowth.medication || '')}</textarea>
        </div>
      </div>
    </div>

    <!-- SECTION 2: BLOOD TEST REPORT -->
    <div class="clinical-section-card">
      <div class="clinical-section-header">
        <div class="clinical-section-title">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#dc2626" stroke-width="2.2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
          <span>Blood Test Report</span>
        </div>
        <span class="clinical-sync-badge" style="background:#fee2e2; color:#b91c1c;">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M4 10h16"/><path d="M10 4v16"/></svg>
          Syncs to Sheet Row 19
        </span>
      </div>

      <div class="clinical-grid-4">
        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}blood-date">DATE</label>
          <input class="clinical-input" id="${prefix}blood-date" type="date" name="blood_date" value="${existingBlood.date || dateVal}" />
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}blood-hb">HAEMOGLOBIN</label>
          <div class="clinical-input-unit-wrapper">
            <input class="clinical-input" id="${prefix}blood-hb" type="text" name="hemoglobin" placeholder="13.2" value="${escapeHTML(existingBlood.hemoglobin || existingBlood.hb || '')}" />
            <span class="clinical-input-unit">g/dL</span>
          </div>
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}blood-wbc">WBC</label>
          <div class="clinical-input-unit-wrapper">
            <input class="clinical-input" id="${prefix}blood-wbc" type="text" name="wbc" placeholder="7500" value="${escapeHTML(existingBlood.wbc || '')}" />
            <span class="clinical-input-unit">/cumm</span>
          </div>
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}blood-platelets">PLATELETS</label>
          <div class="clinical-input-unit-wrapper">
            <input class="clinical-input" id="${prefix}blood-platelets" type="text" name="platelets" placeholder="2.5" value="${escapeHTML(existingBlood.platelets || '')}" />
            <span class="clinical-input-unit">Lakhs</span>
          </div>
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}blood-rbc">RBC</label>
          <div class="clinical-input-unit-wrapper">
            <input class="clinical-input" id="${prefix}blood-rbc" type="text" name="rbc" placeholder="4.5" value="${escapeHTML(existingBlood.rbc || '')}" />
            <span class="clinical-input-unit">M/µL</span>
          </div>
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}blood-pcv">PCV</label>
          <div class="clinical-input-unit-wrapper">
            <input class="clinical-input" id="${prefix}blood-pcv" type="text" name="pcv" placeholder="38" value="${escapeHTML(existingBlood.pcv || '')}" />
            <span class="clinical-input-unit">%</span>
          </div>
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}blood-neutrophil">NEUTROPHIL</label>
          <div class="clinical-input-unit-wrapper">
            <input class="clinical-input" id="${prefix}blood-neutrophil" type="text" name="neutrophil" placeholder="62" value="${escapeHTML(existingBlood.neutrophil || '')}" />
            <span class="clinical-input-unit">%</span>
          </div>
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}blood-lymphocytes">LYMPHOCYTES</label>
          <div class="clinical-input-unit-wrapper">
            <input class="clinical-input" id="${prefix}blood-lymphocytes" type="text" name="lymphocytes" placeholder="30" value="${escapeHTML(existingBlood.lymphocytes || '')}" />
            <span class="clinical-input-unit">%</span>
          </div>
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}blood-eosinophils">EOSINOPHILS</label>
          <div class="clinical-input-unit-wrapper">
            <input class="clinical-input" id="${prefix}blood-eosinophils" type="text" name="eosinophils" placeholder="4" value="${escapeHTML(existingBlood.eosinophils || '')}" />
            <span class="clinical-input-unit">%</span>
          </div>
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}blood-monocytes">MONOCYTES</label>
          <div class="clinical-input-unit-wrapper">
            <input class="clinical-input" id="${prefix}blood-monocytes" type="text" name="monocytes" placeholder="3" value="${escapeHTML(existingBlood.monocytes || '')}" />
            <span class="clinical-input-unit">%</span>
          </div>
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}blood-basophils">BASOPHILS</label>
          <div class="clinical-input-unit-wrapper">
            <input class="clinical-input" id="${prefix}blood-basophils" type="text" name="basophils" placeholder="1" value="${escapeHTML(existingBlood.basophils || '')}" />
            <span class="clinical-input-unit">%</span>
          </div>
        </div>

        <div class="clinical-field-group">
          <label class="clinical-field-label" for="${prefix}blood-platelets-adequacy">PLATELETS ADEQUACY</label>
          <input class="clinical-input" id="${prefix}blood-platelets-adequacy" type="text" name="plateletsAdequacy" placeholder="Adequate on smear" value="${escapeHTML(existingBlood.plateletsAdequacy || '')}" />
        </div>

        <div class="clinical-field-group" style="grid-column: span 2;">
          <label class="clinical-field-label" for="${prefix}blood-rbc-morph">RBC MORPHOLOGY</label>
          <input class="clinical-input" id="${prefix}blood-rbc-morph" type="text" name="rbcMorphology" placeholder="e.g. Normocytic Normochromic" value="${escapeHTML(existingBlood.rbcMorphology || '')}" />
        </div>

        <div class="clinical-field-group" style="grid-column: span 2;">
          <label class="clinical-field-label" for="${prefix}blood-wbc-morph">WBC MORPHOLOGY</label>
          <input class="clinical-input" id="${prefix}blood-wbc-morph" type="text" name="wbcMorphology" placeholder="e.g. Normal in number and morphology" value="${escapeHTML(existingBlood.wbcMorphology || '')}" />
        </div>
      </div>
    </div>
  `;
}

export function renderClinicalDataModalMarkup(eventId, childIdParam = null, childNameParam = null) {
  const appointments = getAppointments();
  const appt = eventId ? appointments.find(a => String(a.id) === String(eventId)) : null;

  const childId = appt ? appt.childId : childIdParam;
  let childName = appt ? (appt.childName || 'Child') : (childNameParam || 'Child');
  const targetDate = appt?.date || new Date().toISOString().slice(0, 10);

  if (!childId && !appt) return '';

  if (childId && !appt) {
    const children = getChildren();
    const c = children.find(ch => ch.id === childId || (ch.name && ch.name.toLowerCase() === (childNameParam || '').toLowerCase()));
    if (c) childName = c.name;
  }

  // Retrieve any existing growth record for this child on this date (or latest)
  const growthRecords = childId ? getGrowthRecords(childId) : [];
  const existingGrowth = (appt?.date ? growthRecords.find(g => g.date === targetDate) : null) || growthRecords[0] || {};

  // Retrieve any existing blood test record for this child on this date (or latest)
  const healthRecords = childId ? getHealthRecords(childId) : [];
  const existingBlood = (appt?.date ? healthRecords.find(h => h.date === targetDate) : null) || healthRecords[0] || {};

  const subTitle = appt ? `${escapeHTML(appt.type || 'Appointment')} (${appt.date})` : 'Student Medical Records';

  return `
    <div class="gcal-popup-backdrop" id="cal-booking-modal" data-close-cal-modal-bg role="presentation">
      <div class="gcal-popup-card gcal-clinical-modal-card" role="dialog" aria-modal="true">
        <!-- Banner Header -->
        <div class="gcal-popover-banner" style="background-image: url('assets/gcal_event_banner.png'); height: 105px; min-height: 105px;">
          <div class="gcal-popover-banner-overlay"></div>
          <button class="gcal-popup-close" type="button" aria-label="Close" data-close-cal-modal style="position:absolute; top:10px; right:12px; z-index:5; color:#fff; background:rgba(0,0,0,0.3); border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div style="position:absolute; bottom:12px; left:20px; color:#fff; z-index:3;">
            <div style="font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; opacity:0.92; margin-bottom:2px; display:flex; align-items:center; gap:6px;">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              Clinical Details &amp; Google Sheet Sync
            </div>
            <div style="font-size:18px; font-weight:700; text-shadow:0 1px 4px rgba(0,0,0,0.6); display:flex; align-items:center; gap:8px;">
              <span>${escapeHTML(childName)}</span>
              ${childId ? `<span style="font-size:11px; font-weight:600; background:rgba(255,255,255,0.25); backdrop-filter:blur(4px); padding:2px 8px; border-radius:10px;">${escapeHTML(childId)}</span>` : ''}
              <span style="font-size:12px; font-weight:500; opacity:0.85;">· ${subTitle}</span>
            </div>
          </div>
        </div>

        <form id="clinical-data-form" style="display:flex; flex-direction:column; flex:1; min-height:0; overflow:hidden;">
          <input type="hidden" name="appointmentId" value="${appt?.id || ''}" />
          <input type="hidden" name="childId" value="${childId || ''}" />
          <input type="hidden" name="childName" value="${escapeHTML(childName)}" />
          <input type="hidden" name="existingGrowthId" value="${existingGrowth.id || ''}" />
          <input type="hidden" name="existingBloodId" value="${existingBlood.id || ''}" />

          <div class="gcal-clinical-modal-body">
            ${renderClinicalSectionsMarkup({ existingGrowth, existingBlood, targetDate, prefix: 'modal-' })}
          </div>

          <!-- Footer Actions -->
          <div class="clinical-modal-footer">
            <button class="gcal-btn gcal-btn--secondary" type="button" data-close-cal-modal style="padding:8px 16px; font-size:13px;">
              Cancel
            </button>
            <button class="gcal-btn gcal-btn--create" id="btn-save-clinical-data" type="submit" style="padding:8px 20px; font-size:13px; gap:6px;">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Save &amp; Sync to Sheet
            </button>
          </div>
        </form>
      </div>
    </div>`;
}

export function renderEditAppointmentModalMarkup(eventId) {
  const appointments = getAppointments();
  const appt = appointments.find(a => String(a.id) === String(eventId));
  if (!appt) return '';

  const children = getChildren();
  const childOptions = children.map(c => 
    `<option value="${c.id}" ${c.id === appt.childId ? 'selected' : ''}>${escapeHTML(c.name)} (${c.id})</option>`
  ).join('');

  const typeOptions = [
    { value: 'Doctor visit', label: 'Doctor Visit' },
    { value: 'Follow-up', label: 'Follow-up' },
    { value: 'Dental checkup', label: 'Dental Checkup' },
    { value: 'Deworming', label: 'Deworming' },
    { value: 'Vaccination', label: 'Vaccination' },
    { value: 'Monthly checkup', label: 'Monthly Checkup' },
    { value: 'Oral checkup', label: 'Oral Checkup' }
  ].map(t => `<option value="${t.value}" ${t.value.toLowerCase() === (appt.type || '').toLowerCase() ? 'selected' : ''}>${t.label}</option>`).join('');

  const statusOptions = [
    { value: 'Upcoming', label: 'Upcoming' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' }
  ].map(s => `<option value="${s.value}" ${s.value.toLowerCase() === (appt.status || 'upcoming').toLowerCase() ? 'selected' : ''}>${s.label}</option>`).join('');

  const specialtyOptions = DOCTOR_SPECIALTIES.map(s => 
    `<option value="${escapeHTML(s)}" ${s.toLowerCase() === (appt.specialty || '').toLowerCase() ? 'selected' : ''}>${escapeHTML(s)}</option>`
  ).join('');

  return `
    <div class="gcal-popup-backdrop" id="cal-booking-modal" data-close-cal-modal-bg role="presentation">
      <div class="gcal-popup-card gcal-edit-modal-card" role="dialog" aria-modal="true">
        <!-- Header with Banner & Close Button -->
        <div class="gcal-popover-banner" style="background-image: url('assets/gcal_event_banner.png'); height: 110px;">
          <div class="gcal-popover-banner-overlay"></div>
          <button class="gcal-popup-close" type="button" aria-label="Close" data-close-cal-modal style="position:absolute; top:10px; right:12px; z-index:5;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div style="position:absolute; bottom:12px; left:16px; color:#fff; font-weight:700; font-size:16px; text-shadow:0 1px 4px rgba(0,0,0,0.6); display:flex; align-items:center; gap:8px; z-index:3;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit Appointment
          </div>
        </div>

        <form class="gcal-popup-form" id="cal-edit-appointment-form" style="padding:16px 20px;">
          <input type="hidden" name="id" value="${appt.id}" />

          <!-- Title / Doctor row -->
          <div class="gcal-popup-title-row" style="margin-bottom:12px;">
            <input class="gcal-popup-title-input" name="doctor" type="text" placeholder="Add doctor or clinic title" value="${escapeHTML(appt.doctor || '')}" autocomplete="off" />
          </div>

          <div class="gcal-popup-rows">
            <!-- Date & Time -->
            <div class="gcal-popup-row">
              <div class="gcal-popup-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <div class="gcal-popup-row-content">
                <div class="gcal-popup-datetime">
                  <input class="gcal-popup-date-input" name="date" type="date" value="${appt.date || ''}" required />
                  <input class="gcal-popup-time-input" name="time" type="time" value="${appt.time || '10:00'}" />
                </div>
              </div>
            </div>

            <!-- Child select -->
            <div class="gcal-popup-row">
              <div class="gcal-popup-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div class="gcal-popup-row-content">
                <select class="gcal-popup-select" name="childId" required>
                  <option value="">Select child</option>
                  ${childOptions}
                </select>
              </div>
            </div>

            <!-- Type -->
            <div class="gcal-popup-row">
              <div class="gcal-popup-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div class="gcal-popup-row-content">
                <select class="gcal-popup-select" name="type" required>
                  ${typeOptions}
                </select>
              </div>
            </div>

            <!-- Speciality of doctor (Optional, can be empty) -->
            <div class="gcal-popup-row">
              <div class="gcal-popup-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
              </div>
              <div class="gcal-popup-row-content">
                <select class="gcal-popup-select" name="specialty">
                  <option value="">Speciality of doctor</option>
                  ${specialtyOptions}
                </select>
              </div>
            </div>

            <!-- Status -->
            <div class="gcal-popup-row">
              <div class="gcal-popup-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="gcal-popup-row-content">
                <select class="gcal-popup-select" name="status">
                  ${statusOptions}
                </select>
              </div>
            </div>

            <!-- Notes -->
            <div class="gcal-popup-row">
              <div class="gcal-popup-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
              </div>
              <div class="gcal-popup-row-content">
                <textarea class="gcal-popup-notes" name="notes" rows="2" placeholder="Add description or clinical notes">${escapeHTML(appt.notes || '')}</textarea>
              </div>
            </div>
          </div>

          <!-- Footer buttons -->
          <div class="gcal-popup-footer" style="display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-top:14px;">
            <button class="gcal-popup-more-btn" type="button" data-event-id="${appt.id}">Cancel</button>
            <button class="gcal-popup-save-btn" type="submit">Save Changes</button>
          </div>
        </form>
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
            Register Appointment
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

  const mode = viewMode || 'month';
  const isMonthView = mode === 'month';
  const monthName = MONTH_NAMES[month];
  const dateObj = new Date(year, month, day);
  const dayName = DAY_NAMES[dateObj.getDay()];

  root.setAttribute('data-cal-view-mode', mode);
  root.setAttribute('data-cal-year', String(year));
  root.setAttribute('data-cal-month', String(month));
  root.setAttribute('data-cal-day', String(day));

  const titleEl = root.querySelector('[data-calendar-title]');
  if (titleEl) {
    titleEl.textContent = isMonthView ? `${monthName} ${year}` : `${dayName}, ${day} ${monthName} ${year}`;
  }

  root.querySelectorAll('[data-cal-view]').forEach(btn => {
    if (btn.getAttribute('data-cal-view') === mode) {
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
