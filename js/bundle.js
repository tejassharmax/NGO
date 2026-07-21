(function () {
  'use strict';

  const icons = {
    grid: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    users: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    file: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>',
    chart: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m7 16 4-5 3 3 5-7"/></svg>',
    export: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M4 21h16"/></svg>',
    settings: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    menu: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    search: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
    bell: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
    sun: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    plus: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    upload: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 16V3M7 8l5-5 5 5M5 21h14"/></svg>',
    arrowRight: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    arrowUp: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    filter: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5h16M7 12h10M10 19h4"/></svg>',
    chevronDown: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    chevronLeft: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
    chevronRight: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
    more: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></svg>',
    eye: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    pencil: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>',
    trash: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></svg>',
    download: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
    check: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
    clock: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    scan: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h10"/></svg>',
    calendar: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    paperclip: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l8.5-8.5a4 4 0 1 1 5.7 5.7l-8.5 8.5a2 2 0 1 1-2.8-2.8l7.8-7.8"/></svg>',
    printer: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></svg>',
    mail: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    moon: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.2 14.5A8.5 8.5 0 0 1 9.5 3.8 8.5 8.5 0 1 0 20.2 14.5Z"/></svg>',
    x: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    rotate: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0 1 5"/><path d="M20 4v7h-7"/></svg>',
    maximize: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/></svg>',
    lock: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'
  };

  const icon = (name) => icons[name] || '';
  const initials = (name) => name.split(' ').map((item) => item[0]).join('').slice(0, 2).toUpperCase();
  const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
  const formatDate = (date) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));
  const pagePath = (page) => {
    const inPages = window.location.pathname.replace(/\\/g, '/').includes('/pages/');
    if (page === 'dashboard') return inPages ? '../index.html' : 'index.html';
    return inPages ? `${page}.html` : `pages/${page}.html`;
  };
  const statusBadge = (status) => `<span class="badge badge--${status === 'Active' || status === 'Verified' ? 'success' : status === 'Pending' ? 'warning' : 'neutral'}"><i class="badge__dot"></i>${status}</span>`;

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

  function getStudents() {
    const data = localStorage.getItem(KEY);
    if (!data) {
      localStorage.setItem(KEY, JSON.stringify(seedStudents));
      return seedStudents;
    }
    return JSON.parse(data);
  }

  function updateStudent(student) {
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

  function deleteStudent(id) {
    const student = getStudents().find(s => s.id === id);
    localStorage.setItem(KEY, JSON.stringify(getStudents().filter((s) => s.id !== id)));
    if (student) {
      logActivity('student_deleted', student.name, 'Student record removed');
    }
  }

  function getStudent(id) {
    return getStudents().find((student) => student.id === id) || getStudents()[0];
  }

  /* ─── activity log ─── */
  function logActivity(type, subject, description) {
    const activities = getActivities();
    activities.unshift({ type, subject, description, timestamp: Date.now() });
    if (activities.length > 50) activities.length = 50;
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
  }

  function getActivities() {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
  }

  function timeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  function activityIcon(type) {
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

  function activityLabel(type) {
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
  function getPendingDocs() {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  }

  function addPendingDoc(docName, studentName) {
    const docs = getPendingDocs();
    docs.unshift({ docName, studentName, timestamp: Date.now() });
    if (docs.length > 20) docs.length = 20;
    localStorage.setItem(PENDING_KEY, JSON.stringify(docs));
  }

  function studentRows(students) {
    if (!students.length) return `<tr><td colspan="7"><div class="empty-state"><span class="empty-state__icon">${icon('users')}</span><h3>No students found</h3><p>Try changing your search or create a new student record.</p></div></td></tr>`;
    return students.map((student) => `<tr>
    <td><label class="checkbox"><input type="checkbox" aria-label="Select ${student.name}" data-select-row="${student.id}"><span class="sr-only">Select</span></label></td>
    <td><a class="table-person" href="${pagePath('student-profile')}?id=${student.id}"><span class="table-avatar">${initials(student.name)}</span><span><b>${student.name}</b><span>${student.id}</span></span></a></td>
    <td>${student.class}</td><td class="hide-tablet">${student.gender}</td><td class="hide-tablet">${student.blood}</td><td>${statusBadge(student.status)}</td>
    <td><div class="table-actions"><a class="icon-button icon-button--small tooltip" data-tooltip="View" aria-label="View ${student.name}" href="${pagePath('student-profile')}?id=${student.id}">${icon('eye')}</a><button class="icon-button icon-button--small tooltip" data-tooltip="Edit" type="button" aria-label="Edit ${student.name}" data-edit="${student.id}">${icon('pencil')}</button><button class="icon-button icon-button--small tooltip" data-tooltip="Delete" type="button" aria-label="Delete ${student.name}" data-delete="${student.id}">${icon('trash')}</button></div></td>
  </tr>`).join('');
  }

  function updateStudentTable(students) {
    const body = document.querySelector('#student-table-body');
    if (body) body.innerHTML = studentRows(students);
    const count = document.querySelector('#student-count');
    if (count) count.textContent = `${students.length} students`;
  }

  function getChartData() {
    const students = getStudents();
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const yearStr = String(d.getFullYear());
      const count = students.filter(s => s.admission && s.admission.includes(`${yearStr}-${monthStr}-`)).length;
      data.push({ month: months[d.getMonth()], value: count, label: fullMonths[d.getMonth()] });
    }
    return data;
  }

  function admissionsChart() {
    const chartData = getChartData();
    const currentValue = chartData[chartData.length - 1]?.value || 0;
    const prevValue = chartData[chartData.length - 2]?.value || 0;
    const pctChange = prevValue > 0 ? Math.round((currentValue - prevValue) / prevValue * 100) : (currentValue > 0 ? 100 : 0);
    const changeText = pctChange >= 0 ? `+${pctChange}%` : `${pctChange}%`;

    return `<div class="chart-summary"><b>${currentValue}</b><span>${changeText} vs. last month</span></div>
  <div class="chart-interactive" id="admissions-chart">
    <svg class="chart-canvas" viewBox="0 0 640 180" preserveAspectRatio="none" aria-label="Admissions overview chart">
      <defs>
        <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.00"/>
        </linearGradient>
      </defs>
      <g class="chart-grid"></g>
      <path class="chart-area-path" d=""></path>
      <path class="chart-line-path" d=""></path>
      <line class="chart-hover-line" x1="0" y1="0" x2="0" y2="155" style="display:none;"></line>
      <circle class="chart-hover-circle" cx="0" cy="0" r="5" style="display:none;"></circle>
    </svg>
    <div class="chart-tooltip-html" style="opacity: 0;"></div>
    <div class="chart-labels"></div>
  </div>`;
  }

  function initChart() {
    const chart = document.getElementById('admissions-chart');
    if (!chart) return;

    const chartData = getChartData();
    const svg = chart.querySelector('.chart-canvas');
    const tooltip = chart.querySelector('.chart-tooltip-html');
    const labelsDiv = chart.querySelector('.chart-labels');
    const gridGroup = svg.querySelector('.chart-grid');
    const areaPath = svg.querySelector('.chart-area-path');
    const linePath = svg.querySelector('.chart-line-path');
    const hoverLine = svg.querySelector('.chart-hover-line');
    const hoverCircle = svg.querySelector('.chart-hover-circle');

    const W = 640;
    const H = 180;
    const padX = 30;
    const padY = 25;
    const maxVal = Math.max(5, ...chartData.map(d => d.value)) * 1.2 || 10;

    // Render Grid Lines
    gridGroup.innerHTML = '';
    const gridLines = 5;
    for (let i = 0; i < gridLines; i++) {
      const y = padY + (i / (gridLines - 1)) * (H - 2 * padY);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '0');
      line.setAttribute('y1', String(y));
      line.setAttribute('x2', String(W));
      line.setAttribute('y2', String(y));
      line.setAttribute('class', 'chart-grid-line');
      gridGroup.appendChild(line);
    }

    // Calculate coordinates
    const points = chartData.map((d, i) => {
      const x = padX + (i / (chartData.length - 1)) * (W - 2 * padX);
      const y = H - padY - (d.value / maxVal) * (H - 2 * padY);
      return { x, y, value: d.value, month: d.month, label: d.label };
    });

    // Render chart labels
    labelsDiv.innerHTML = points.map(p => `<span>${p.month}</span>`).join('');

    // Generate cubic bezier paths
    if (points.length > 0) {
      let lineD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const cp1x = p1.x + (p2.x - p1.x) / 3;
        const cp2x = p1.x + 2 * (p2.x - p1.x) / 3;
        lineD += ` C ${cp1x} ${p1.y}, ${cp2x} ${p2.y}, ${p2.x} ${p2.y}`;
      }
      linePath.setAttribute('d', lineD);

      const areaD = `${lineD} L ${points[points.length - 1].x} ${H - padY} L ${points[0].x} ${H - padY} Z`;
      areaPath.setAttribute('d', areaD);
    }

    // Interactive Hover Effects
    svg.addEventListener('pointermove', (event) => {
      const rect = svg.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width) * W;

      // Find closest point
      let closest = points[0];
      let minDist = Math.abs(points[0].x - mouseX);
      points.forEach(p => {
        const dist = Math.abs(p.x - mouseX);
        if (dist < minDist) {
          minDist = dist;
          closest = p;
        }
      });

      // Show hover line and circle
      hoverLine.setAttribute('x1', String(closest.x));
      hoverLine.setAttribute('x2', String(closest.x));
      hoverLine.style.display = '';

      hoverCircle.setAttribute('cx', String(closest.x));
      hoverCircle.setAttribute('cy', String(closest.y));
      hoverCircle.style.display = '';

      // Show tooltip
      tooltip.innerHTML = `<strong>${closest.label}</strong><div>${closest.value} admission${closest.value !== 1 ? 's' : ''}</div>`;
      tooltip.style.opacity = '1';
      
      // Position tooltip
      const tipRect = tooltip.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      const tooltipX = (closest.x / W) * svgRect.width - tipRect.width / 2;
      const tooltipY = (closest.y / H) * svgRect.height - tipRect.height - 10;
      
      tooltip.style.transform = `translate(${tooltipX}px, ${tooltipY}px)`;
    });

    svg.addEventListener('pointerleave', () => {
      hoverLine.style.display = 'none';
      hoverCircle.style.display = 'none';
      tooltip.style.opacity = '0';
    });
  }

  const nav = [
    ['dashboard', 'Dashboard', 'grid'],
    ['students', 'Students', 'users'],
    ['documents', 'Documents', 'file'],
    ['reports', 'Reports', 'chart'],
    ['export', 'Export', 'export']
  ];

  const pageTitles = {
    dashboard: 'Dashboard',
    students: 'Students',
    'student-profile': 'Student profile',
    'add-student': 'Add student',
    'ocr-upload': 'Smart upload',
    'ocr-review': 'Review extracted information',
    'ocr-details': 'Additional details',
    documents: 'Documents',
    reports: 'Reports',
    export: 'Export centre',
    settings: 'Settings'
  };

  function navItem(item, active) {
    const [page, label, glyph] = item;
    return `<a class="nav-item ${page === active ? 'nav-item--active' : ''}" href="${pagePath(page)}" ${page === active ? 'aria-current="page"' : ''}>${icon(glyph)}<span class="nav-item__text">${label}</span></a>`;
  }

  function shell(page, content) {
    const orgName = localStorage.getItem('orbit-org-name') || 'An Organisation';
    const orgInitials = orgName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'AO';
    return `<div class="app-shell">
    <aside class="sidebar" aria-label="Primary navigation">
      <div class="sidebar__header"><a class="sidebar__brand" href="${pagePath('dashboard')}" aria-label="Orbit home"><span class="brand-mark">${icon('users')}</span><span class="brand-name">orbit</span></a><button class="sidebar__toggle" type="button" data-collapse-sidebar aria-label="Collapse sidebar">${icon('menu')}</button></div>
      <nav class="sidebar__nav">${nav.map((item) => navItem(item, page)).join('')}<div class="sidebar__label">Workspace</div><a class="nav-item ${page === 'settings' ? 'nav-item--active' : ''}" href="${pagePath('settings')}">${icon('settings')}<span class="nav-item__text">Settings</span></a></nav>
      <div class="sidebar__foot"><div class="workspace-user"><span class="workspace-user__avatar">${orgInitials}</span><span class="workspace-user__copy"><span class="workspace-user__name">${orgName}</span><span class="workspace-user__role">Admin</span></span></div></div>
    </aside><div class="mobile-backdrop" hidden data-close-sidebar></div>
    <main class="app-main" id="app-main"><header class="topbar">${page === 'dashboard' ? '' : `<button class="icon-button" data-topbar-back aria-label="Go back">${icon('chevronLeft')}</button>`}<div class="topbar__crumbs"><span>Orbit</span><span aria-hidden="true"> / </span><b>${pageTitles[page] || 'Workspace'}</b></div><label class="topbar-search"><span class="sr-only">Search student records</span>${icon('search')}<input type="search" placeholder="Search student records" data-global-search><kbd>⌘ K</kbd></label><div class="topbar__actions"><button class="icon-button tooltip" data-tooltip="Toggle theme" data-theme-toggle type="button" aria-label="Toggle color theme">${icon('sun')}</button><button class="icon-button tooltip" data-tooltip="Notifications" type="button" aria-label="Notifications" data-notifications>${icon('bell')}</button><div class="topbar-profile"><button class="topbar-profile__trigger" data-profile-menu type="button" aria-haspopup="true" aria-expanded="false"><span class="avatar">AD</span><span class="topbar-profile__name">Admin</span>${icon('chevronDown')}</button><div class="dropdown" hidden data-profile-dropdown><a class="dropdown__item" href="${pagePath('settings')}">${icon('settings')}Account settings</a><div class="divider"></div><button class="dropdown__item" type="button" data-sign-out>${icon('lock')}Sign out</button></div></div></div></header><section class="content page-enter">${content}</section></main></div>`;
  }

  const heading = (title, description, actions) => `<div class="page-heading"><div class="page-heading__copy"><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="page-heading__actions">${actions}</div>` : ''}</div>`;

  function getDynamicGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning, Admin';
    if (hour < 17) return 'Good afternoon, Admin';
    return 'Good evening, Admin';
  }

  const statCard = (label, value, trend, glyph, color) => `<article class="card stat-card card--interactive"><div class="stat-card__top"><span class="stat-card__label">${label}</span><span class="stat-card__icon stat-card__icon--${color}">${icon(glyph)}</span></div><div class="stat-card__number">${value}</div><div class="stat-card__footer"><span class="trend--up">${icon('arrowUp')} ${trend}</span><span>from last month</span></div></article>`;

  function dashboardPage() {
    const students = getStudents();
    const totalStudents = students.length;
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const admissionsThisMonth = students.filter(s => s.admission && s.admission.includes(`-${currentMonth}-`)).length;
    students.filter(s => s.status === 'Pending').length;
    const verifiedCount = students.filter(s => s.status === 'Verified' || s.status === 'Active').length;

    // Recent activity from localStorage
    const activities = getActivities().slice(0, 5);
    let activityHTML = '';
    if (activities.length === 0) {
      activityHTML = `<div class="empty-state" style="padding:24px 12px"><span class="empty-state__icon">${icon('clock')}</span><h3 style="font-size:13px">No activity yet</h3><p>Actions like adding students or uploading documents will appear here.</p></div>`;
    } else {
      activityHTML = `<div class="activity-list">${activities.map(a => `<div class="activity-item"><span class="activity-icon">${icon(activityIcon(a.type))}</span><div class="activity-copy"><b>${activityLabel(a.type)}</b> for ${a.subject}<time>${timeAgo(a.timestamp)}</time></div></div>`).join('')}</div>`;
    }

    // Pending documents from localStorage
    const pendingDocs = getPendingDocs().slice(0, 5);
    const pendingDocsTotal = getPendingDocs().length;
    let pendingDocsHTML = '';
    if (pendingDocs.length === 0) {
      pendingDocsHTML = `<div class="empty-state" style="padding:24px 12px"><span class="empty-state__icon">${icon('file')}</span><h3 style="font-size:13px">No pending documents</h3><p>Documents pending review will appear here.</p></div>`;
    } else {
      pendingDocsHTML = pendingDocs.map((doc, index) => `<div class="list-row"><span class="list-row__avatar">${index + 1}</span><span class="list-row__copy"><b>${doc.docName}</b><span>${doc.studentName}</span></span><span class="list-row__meta">Awaiting<br>review</span></div>`).join('');
    }

    // Recent admissions table
    let recentAdmissionsHTML = '';
    if (students.length === 0) {
      recentAdmissionsHTML = `<tr><td colspan="4"><div class="empty-state" style="padding:30px 12px"><span class="empty-state__icon">${icon('users')}</span><h3 style="font-size:13px">No students yet</h3><p>Add your first student to get started.</p></div></td></tr>`;
    } else {
      recentAdmissionsHTML = students.slice(0, 4).map((student) => `<tr><td><a class="table-person" href="${pagePath('student-profile')}?id=${student.id}"><span class="table-avatar">${initials(student.name)}</span><span class="table-person__info"><b class="table-person__name">${student.name}</b><span class="table-person__id">${student.id}</span></span></a></td><td>${student.class}</td><td class="hide-tablet">${formatDate(student.admission)}</td><td>${statusBadge(student.status)}</td></tr>`).join('');
    }

    return shell('dashboard', `${heading(getDynamicGreeting(), 'Here’s a calm overview of your school workspace today.', `<a class="button" href="${pagePath('ocr-upload')}">${icon('scan')}Smart upload</a><a class="button button--primary" href="${pagePath('add-student')}">${icon('plus')}Add student</a>`)}
  <div class="stat-grid">${statCard('Total students', totalStudents.toLocaleString(), admissionsThisMonth > 0 ? Math.round(admissionsThisMonth / Math.max(totalStudents, 1) * 100) + '%' : '0%', 'users', 'blue')}${statCard('Admissions this month', admissionsThisMonth.toLocaleString(), admissionsThisMonth > 0 ? '+' + admissionsThisMonth : '0', 'calendar', 'green')}${statCard('Pending documents', pendingDocsTotal.toLocaleString(), pendingDocsTotal > 0 ? pendingDocsTotal + ' need review' : 'All clear', 'file', 'amber')}${statCard('Verified records', verifiedCount.toLocaleString(), totalStudents > 0 ? Math.round(verifiedCount / totalStudents * 100) + '%' : '0%', 'check', 'violet')}</div>
  <div class="dashboard-grid dashboard-grid--primary"><section class="card chart-card"><header class="card__header"><div><h2 class="card__title">Admissions overview</h2><p class="card__caption">Student admissions over the last seven months</p></div><button class="button button--sm" data-report-export>${icon('download')}Export</button></header><div class="chart-card__body">${admissionsChart()}</div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Quick actions</h2><p class="card__caption">Common tasks, kept close</p></div></header><div class="card__body"><div class="quick-actions"><a class="quick-action" href="${pagePath('add-student')}"><span class="quick-action__icon">${icon('plus')}</span>Add student</a><a class="quick-action" href="${pagePath('ocr-upload')}"><span class="quick-action__icon">${icon('scan')}</span>Scan document</a><a class="quick-action" href="${pagePath('reports')}"><span class="quick-action__icon">${icon('chart')}</span>View reports</a><a class="quick-action" href="${pagePath('documents')}"><span class="quick-action__icon">${icon('file')}</span>Review files</a></div></div></section></div>
  <div class="dashboard-grid dashboard-grid--lower"><section class="card"><header class="card__header"><div><h2 class="card__title">Recent admissions</h2><p class="card__caption">Latest records added to your workspace</p></div><a class="button button--sm" href="${pagePath('students')}">View all ${icon('arrowRight')}</a></header><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Class</th><th class="hide-tablet">Admission date</th><th>Status</th></tr></thead><tbody>${recentAdmissionsHTML}</tbody></table></div></section><div class="dashboard-grid"><section class="card"><header class="card__header"><div><h2 class="card__title">Recent activity</h2></div><button class="icon-button icon-button--small" type="button" data-activity>${icon('more')}</button></header><div class="card__body">${activityHTML}</div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Pending documents</h2><p class="card__caption">Needs a quick review</p></div><span class="badge badge--warning">${pendingDocsTotal > 0 ? pendingDocsTotal + ' pending' : 'None'}</span></header><div class="card__body">${pendingDocsHTML}</div></section></div></div>`);
  }

  function loginPage() {
    return `<main class="login-page"><section class="login-panel"><div class="login-panel__brand" aria-label="Orbit home"><span class="brand-mark">${icon('users')}</span><b>orbit</b></div><div class="card login-card"><h1>Workspace access</h1>
  
  <div style="background:rgba(37,99,235,0.1); color:var(--color-primary); padding:10px 14px; border-radius:8px; font-size:12px; margin-bottom:18px; border:1px solid rgba(37,99,235,0.15); line-height:1.4">
    🔑 <b>Demo Admin Credentials:</b> Use ID <code>admin-ngo</code>
  </div>

  <form data-login-form>
    <label class="field">
      <span class="field__label">Admin User ID *</span>
      <input class="input" type="text" data-admin-id-input placeholder="e.g. admin-ngo" required autocomplete="off">
    </label>
    <button class="button button--primary" type="submit" style="width:100%; margin-top:6px; min-height:44px; font-size:14px">Sign in with Admin ID ${icon('arrowRight')}</button>
  </form>

  <div style="display:flex; align-items:center; gap:10px; margin:20px 0; color:var(--color-text-muted); font-size:11px">
    <div style="flex:1; height:1px; background:var(--color-border)"></div>
    OR
    <div style="flex:1; height:1px; background:var(--color-border)"></div>
  </div>

  <button class="button tooltip" data-tooltip="Sign in with pre-authorized Google Account" data-google-login type="button" style="width:100%; min-height:44px; display:flex; align-items:center; justify-content:center; gap:10px; font-weight:600; font-size:14px">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.56 2.69-3.86 2.69-6.62Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.85.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18Z" fill="#34A853"/><path d="M3.97 10.76a5.4 5.4 0 0 1 0-3.52V4.91H.95a9 9 0 0 0 0 8.18l3.02-2.33Z" fill="#FBBC05"/><path d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4A9 9 0 0 0 .95 4.91l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58Z" fill="#EA4335"/></svg>
    Continue with Google
  </button>

  <p class="login-card__foot">Protected by role-based permissions and secure audit logs.</p></div></section></main>`;
  }

  function studentsPage() {
    const students = getStudents();
    const totalItems = students.length;
    const itemsPerPage = 5;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const paginated = students.slice(0, itemsPerPage);

    return shell('students', `${heading('Students', 'Search, verify, and manage every student record in one place.', `<button class="button" type="button" data-bulk-export>${icon('export')}Export</button><a class="button button--primary" href="${pagePath('add-student')}">${icon('plus')}Add student</a>`)}
  <section class="card"><div class="table-toolbar"><label class="input-group table-toolbar__search">${icon('search')}<input class="input" id="student-search" type="search" placeholder="Search name, parent, phone, ID…" aria-label="Search students"></label><div class="table-toolbar__actions"><button class="button button--sm" type="button" data-filter-toggle>${icon('filter')}Filters</button><button class="icon-button tooltip" data-tooltip="Column visibility" type="button" aria-label="Change visible columns">${icon('settings')}</button></div></div><div class="filter-row" hidden data-filter-row><label class="field"><span class="field__label">Status</span><select class="select" data-filter-status><option value="">All statuses</option><option>Active</option><option>Pending</option><option>Verified</option></select></label><label class="field"><span class="field__label">Grade</span><select class="select" data-filter-grade><option value="">All grades</option><option>Grade 6</option><option>Grade 7</option><option>Grade 8</option><option>Grade 9</option></select></label><label class="field"><span class="field__label">Blood group</span><select class="select" data-filter-blood><option value="">All groups</option><option>A+</option><option>B+</option><option>O+</option><option>AB+</option></select></label><button class="button button--ghost button--sm" type="button" data-clear-filters>Clear filters</button></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th><label class="checkbox"><input id="select-all" type="checkbox" aria-label="Select all students"><span class="sr-only">Select all</span></label></th><th data-resizable><button class="sort-button" type="button" data-sort="name">Student ${icon('chevronDown')}</button></th><th data-resizable><button class="sort-button" type="button" data-sort="class">Class ${icon('chevronDown')}</button></th><th class="hide-tablet">Gender</th><th class="hide-tablet">Blood group</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody id="student-table-body">${studentRows(paginated)}</tbody></table></div><footer class="pagination"><span id="student-count">${totalItems} students (Page 1 of ${totalPages})</span><div class="pagination__buttons"><button class="button button--sm" id="btn-prev" disabled>${icon('chevronLeft')}Previous</button><button class="button button--sm" id="btn-next" ${totalPages <= 1 ? 'disabled' : ''}>Next${icon('chevronRight')}</button></div></footer></section>`);
  }

  function profilePage() {
    const id = new URLSearchParams(window.location.search).get('id');
    const student = getStudent(id);
    if (!student) {
      return shell('student-profile', '<div class="card"><div class="card__body">Student record not found.</div></div>');
    }

    return shell('student-profile', `${heading('Student profile', 'A complete, well-organized record for this student.', `<button class="button" type="button" data-profile-print>${icon('printer')}Print</button><button class="button button--primary" type="button" data-edit="${student.id}">${icon('pencil')}Edit profile</button>`)}
  <section class="card"><div class="profile-header"><span class="profile-header__avatar">${initials(student.name)}</span><div class="profile-header__copy"><h1>${student.name}</h1><p>${student.id} · ${student.class}</p><div class="profile-header__meta">${statusBadge(student.status)}<span class="badge badge--neutral">${student.gender || 'Not specified'}</span><span class="badge badge--blue">Blood group ${student.blood || 'Unknown'}</span></div></div><div class="profile-header__actions"><button class="icon-button tooltip" type="button" data-tooltip="More actions" aria-label="More actions">${icon('more')}</button></div></div><div class="profile-tabs"><div class="tabs" role="tablist"><button class="tab tab--active" role="tab" aria-selected="true">Overview</button><button class="tab" role="tab">Parents</button><button class="tab" role="tab">Medical</button><button class="tab" role="tab">Education</button><button class="tab" role="tab">Documents</button><button class="tab" role="tab">Timeline</button><button class="tab" role="tab">Notes</button></div></div></section>
  <div class="profile-layout"><div class="dashboard-grid"><section class="card"><header class="card__header"><div><h2 class="card__title">Personal information</h2><p class="card__caption">Core details, last updated today</p></div><button class="icon-button icon-button--small" type="button" data-edit="${student.id}" aria-label="Edit personal information">${icon('pencil')}</button></header><div class="card__body"><div class="detail-list"><div class="detail-row"><span>Full name</span><b>${student.name}</b></div><div class="detail-row"><span>Admission number</span><b>${student.id}</b></div><div class="detail-row"><span>Date of birth</span><b>${student.dob || 'Not specified'}</b></div><div class="detail-row"><span>Gender</span><b>${student.gender || 'Not specified'}</b></div><div class="detail-row"><span>Blood group</span><b>${student.blood || 'Not specified'}</b></div><div class="detail-row"><span>Phone</span><b>${student.phone || 'Not specified'}</b></div><div class="detail-row"><span>Email</span><b>${student.email || 'Not specified'}</b></div><div class="detail-row"><span>Admission date</span><b>${student.admission ? formatDate(student.admission) : 'Not specified'}</b></div></div></div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Education</h2><p class="card__caption">Current enrollment details</p></div></header><div class="card__body"><div class="detail-list"><div class="detail-row"><span>Current class</span><b>${student.class}</b></div><div class="detail-row"><span>Academic year</span><b>2026–27</b></div><div class="detail-row"><span>Roll number</span><b>24</b></div><div class="detail-row"><span>House</span><b>Blue house</b></div></div></div></section></div><div class="dashboard-grid"><section class="card"><header class="card__header"><div><h2 class="card__title">Record timeline</h2><p class="card__caption">Recent changes and events</p></div></header><div class="card__body"><div class="timeline"><div class="timeline__item"><span class="timeline__dot"></span><div class="timeline__copy"><b>Profile verified</b><p>Medical information and address confirmed.</p><time>Today, 10:32 AM</time></div></div><div class="timeline__item"><span class="timeline__dot"></span><div class="timeline__copy"><b>Document added</b><p>Verification document uploaded by administrator.</p><time>12 Jul 2026</time></div></div><div class="timeline__item"><span class="timeline__dot"></span><div class="timeline__copy"><b>Student admitted</b><p>Record created for the 2026–27 academic year.</p><time>${student.admission ? formatDate(student.admission) : 'Recently'}</time></div></div></div></div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Parent contact</h2></div></header><div class="card__body"><div class="detail-list detail-list--single"><div class="detail-row"><span>Father / guardian</span><b>${student.father || 'Not specified'}</b></div><div class="detail-row"><span>Mother name</span><b>${student.mother || 'Not specified'}</b></div><div class="detail-row"><span>Phone</span><b>${student.phone || 'Not specified'}</b></div><div class="detail-row"><span>Relationship</span><b>Primary contact</b></div></div></div></section></div></div>`);
  }

  function steps(active, upload = false) {
    const items = upload ? ['Upload', 'Processing', 'Review & verify', 'Additional details', 'Save student'] : ['Choose method', 'Student details', 'Parent details', 'Review & save'];
    return `<aside class="card form-aside"><div class="stepper">${items.map((item, index) => `<div class="stepper__item ${index < active ? 'stepper__item--complete' : ''} ${index === active ? 'stepper__item--active' : ''}"><span class="stepper__dot">${index < active ? icon('check') : index + 1}</span><span class="stepper__label">${item}</span></div>`).join('')}</div></aside>`;
  }

  const field = (label, name, placeholder, type = 'text', hint = '', value = '') => `<label class="field"><span class="field__label">${label}</span><input class="input" name="${name}" type="${type}" placeholder="${placeholder}" value="${escapeHTML(value)}">${hint ? `<span class="field__hint">${hint}</span>` : ''}</label>`;

  function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const matchDMY = dateStr.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (matchDMY) {
      const [_, d, m, y] = matchDMY;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    } catch (e) {}
    return '';
  }

  function addStudentPage() {
    const searchParams = new URLSearchParams(window.location.search);
    const method = searchParams.get('method');
    const editId = searchParams.get('edit');
    const student = editId ? getStudent(editId) : null;

    if (method !== 'manual' && !editId) {
      return shell('add-student', `${heading('Add a student', 'Choose the quickest, most reliable way to start a new student record.')}<section class="card"><div class="card__body"><div class="method-grid"><article class="method-card card card--interactive"><span class="method-card__icon">${icon('pencil')}</span><div><h2 class="card__title">Enter details manually</h2><p>Start with a clean, guided form. Best when the information is already at hand.</p></div><a class="button" href="${pagePath('add-student')}?method=manual">Start manual entry ${icon('arrowRight')}</a></article><article class="method-card card card--interactive"><span class="method-card__icon">${icon('scan')}</span><div><h2 class="card__title">Smart document upload</h2><p>Extract information from a document, then personally verify every field before saving.</p></div><a class="button button--primary" href="${pagePath('ocr-upload')}">Upload a document ${icon('arrowRight')}</a></article></div></div></section><section class="card section-gap"><div class="card__body"><div class="accordion"><div class="accordion__item is-open"><button class="accordion__trigger" type="button">Why keep manual entry and Smart Upload separate? ${icon('chevronDown')}</button><div class="accordion__content">Documents can speed up entry, but extracted values are never saved automatically. You stay in control of the final student record.</div></div></div></div></section>`);
    }

    // Determine split names for fields
    let firstName = '';
    let lastName = '';
    let email = '';
    let father = '';
    let phone = '';
    let blood = '';
    if (student) {
      const parts = student.name.split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
      email = (student.email === 'No email added') ? '' : student.email || '';
      father = (student.father === 'Not added') ? '' : student.father || '';
      phone = (student.phone === 'Not added') ? '' : student.phone || '';
      blood = (student.blood === 'Not added') ? '' : student.blood || '';
    }

    const title = student ? 'Edit student profile' : 'Add student';
    const desc = student ? 'Modify the student record. Required fields are marked with an asterisk.' : 'Create a reliable student record. Required fields are marked with an asterisk.';
    const submitText = student ? 'Save changes' : 'Save student';

    return shell('add-student', `${heading(title, desc, `<a class="button button--ghost" href="${student ? `${pagePath('student-profile')}?id=${student.id}` : pagePath('students')}">Cancel</a><button class="button button--primary" form="student-form" type="submit">${submitText}</button>`)}<div class="form-layout"><form class="card" id="student-form">${student ? `<input type="hidden" name="id" value="${student.id}">` : ''}<section class="form-section"><div class="form-section__heading"><h2 class="card__title">Student information</h2><p>Use the student’s legal name as it appears on official documents.</p></div><div class="form-grid--two">${field('First name *', 'firstName', 'e.g. Aarav', 'text', '', firstName)}${field('Last name *', 'lastName', 'e.g. Sharma', 'text', '', lastName)}${field('Date of birth *', 'birthDate', '', 'date', '', student ? formatDateForInput(student.dob) : '')}${field('Gender *', 'gender', 'e.g. Male', 'text', '', student ? student.gender : '')}<label class="field"><span class="field__label">Grade *</span><select class="select" name="grade"><option ${student && student.class.includes('Grade 6') ? 'selected' : ''}>Grade 6</option><option ${student && student.class.includes('Grade 7') ? 'selected' : ''}>Grade 7</option><option ${!student || student.class.includes('Grade 8') ? 'selected' : ''}>Grade 8</option><option ${student && student.class.includes('Grade 9') ? 'selected' : ''}>Grade 9</option></select></label><label class="field"><span class="field__label">Section *</span><select class="select" name="section"><option ${student && student.class.includes('A') ? 'selected' : ''}>A</option><option ${student && student.class.includes('B') ? 'selected' : ''}>B</option><option ${student && student.class.includes('C') ? 'selected' : ''}>C</option></select></label>${field('Blood group', 'blood', 'e.g. O+', 'text', '', blood)}${field('Email address', 'email', 'student@example.com', 'email', '', email)}</div></section><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Parent or guardian</h2><p>This contact will receive important school communications.</p></div><div class="form-grid--two">${field('Parent / guardian name *', 'father', 'e.g. Rohan Sharma', 'text', '', father)}${field('Phone number *', 'phone', '+91 00000 00000', 'tel', '', phone)}${field('Email address', 'guardianEmail', 'parent@example.com', 'email', '', email)}${field('Relationship', 'relationship', 'e.g. Father', 'text', '', student ? 'Father' : '')}</div></section><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Address & notes</h2></div><div class="form-grid--two"><label class="field form-span-all"><span class="field__label">Home address</span><textarea class="textarea" name="address" placeholder="Street address, city, state, postcode">${student ? escapeHTML(student.address) : ''}</textarea></label><label class="field form-span-all"><span class="field__label">Internal notes</span><textarea class="textarea" name="notes" placeholder="Optional notes visible to school staff only.">${student ? escapeHTML(student.notes) : ''}</textarea></label></div></section></form>${steps(1)}</div>`);
  }

  function ocrUploadPage() {
    return shell('ocr-upload', `${heading('Smart document upload', 'Upload a clear student document. Nothing will be saved until you review every extracted field.', `<a class="button button--ghost" href="${pagePath('add-student')}">Cancel</a>`)}<div class="form-layout"><section class="card"><div class="card__body"><div class="upload-zone" data-upload-zone><span class="upload-zone__icon">${icon('upload')}</span><h2 class="card__title">Drop a document here</h2><p>Or choose a file from your device. We’ll extract only the details needed for the student record.</p><button class="button button--primary" type="button" data-start-ocr>${icon('file')}Choose document</button><input class="sr-only" type="file" accept=".jpg,.jpeg,.png" data-upload-input><span class="upload-zone__formats">JPG or PNG · Up to 15 MB</span></div></div><div class="form-section"><div class="accordion"><div class="accordion__item is-open"><button class="accordion__trigger" type="button">How Smart Upload protects your data ${icon('chevronDown')}</button><div class="accordion__content">A document is processed only to populate a draft. You review the values, add any missing details, and choose when to create the record.</div></div></div></div></section>${steps(0, true)}</div>`);
  }

  function ocrProcessingPage() {
    return shell('ocr-processing', `${heading('Processing document', 'We’re creating a draft from your upload. This never creates or updates a student record automatically.')}<section class="card"><div class="ocr-processing"><span class="ocr-processing__orbit">${icon('scan')}</span><h2>Extracting information</h2><p>Reading document structure, identifying student details, and preparing them for your review.</p><div class="ocr-processing__progress"><div class="ocr-processing__progress-header"><span>Processing document</span><span class="ocr-progress-pct">0%</span></div><div class="progress"><div class="progress__bar ocr-progress-bar" style="width: 0%"></div></div></div></div></section>`);
  }

  function ocrReviewPage() {
    const ocrData = JSON.parse(localStorage.getItem('ocr-parsed-data') || '{}');
    const firstName = ocrData.firstName || '';
    const lastName = ocrData.lastName || '';
    const dob = ocrData.dob || '';
    const blood = ocrData.blood || '';
    const father = ocrData.father || '';
    const mother = ocrData.mother || '';
    const phone = ocrData.phone || '';
    const idNumber = ocrData.idNumber || '';
    const gender = ocrData.gender || '';

    const uploadedFile = localStorage.getItem('ocr-upload-file');
    let previewHTML = '';
    if (uploadedFile) {
      previewHTML = `<div class="document-preview-img-wrap" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; background:#f3f4f6; position:relative; min-height:360px;">
      <img class="document-preview-img" src="${uploadedFile}" alt="Uploaded document" style="max-width:100%; max-height:100%; object-fit:contain; transition:transform 0.2s ease;" data-rotation="0">
    </div>`;
    } else {
      // Fallback template
      previewHTML = `<div class="document-sheet"><div class="document-sheet__brand">AN ORGANISATION</div><div class="document-sheet__title">STUDENT ADMISSION FORM</div><div class="document-sheet__line document-sheet__line--wide"></div><div class="document-sheet__line document-sheet__line--half"></div><div class="document-sheet__table"><div class="document-sheet__cell"><b>STUDENT NAME</b><span>${firstName} ${lastName}</span></div><div class="document-sheet__cell"><b>DATE OF BIRTH</b><span>${dob}</span></div><div class="document-sheet__cell"><b>FATHER'S NAME</b><span>${father}</span></div><div class="document-sheet__cell"><b>BLOOD GROUP</b><span>${blood}</span></div><div class="document-sheet__cell"><b>CLASS</b><span>VIII A</span></div><div class="document-sheet__cell"><b>PHONE</b><span>${phone}</span></div></div></div>`;
    }

    return shell('ocr-review', `${heading('Review extracted information', 'Check the values below against the original document before continuing.', `<button class="button" type="button" data-ocr-back>Back</button><button class="button button--primary" type="button" data-ocr-continue>Continue to details ${icon('arrowRight')}</button>`)}<div class="form-layout"><div class="review-layout"><section class="card document-preview"><div class="document-toolbar"><span class="badge badge--blue">Uploaded document</span><div class="document-toolbar__controls"><button class="icon-button icon-button--small tooltip" data-tooltip="Rotate" type="button" data-ocr-rotate>${icon('rotate')}</button><button class="icon-button icon-button--small tooltip" data-tooltip="Fullscreen" type="button" data-ocr-fullscreen>${icon('maximize')}</button></div></div>${previewHTML}</section><form class="card"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Extracted fields</h2><p>Fields marked for review are lower-confidence values. Nothing proceeds without your confirmation.</p></div><div class="form-grid--two"><label class="field"><span class="field__label">First name</span><input class="input" value="${firstName}" name="firstName"></label><label class="field"><span class="field__label">Last name</span><input class="input" value="${lastName}" name="lastName"></label><label class="field"><span class="field__label">Date of birth</span><input class="input" value="${dob}" name="date"></label><label class="field"><span class="field__label">Gender</span><input class="input" value="${gender}" name="gender"></label><label class="field"><span class="field__label">Blood group</span><input class="input" value="${blood}" name="blood"></label><label class="field"><span class="field__label">ID number</span><input class="input" value="${idNumber}" name="idNumber"></label><label class="field form-span-all"><span class="field__label">Father / guardian</span><input class="input" value="${father}" name="father"></label><label class="field form-span-all"><span class="field__label">Mother name</span><input class="input" value="${mother}" name="mother"></label></div></section><section class="form-section"><label class="checkbox"><input type="checkbox" data-ocr-confirm required><span>I’ve checked the extracted details against the original document.</span></label></section></form></div>${steps(2, true)}</div>`);
  }

  function ocrDetailsPage() {
    const ocrData = JSON.parse(localStorage.getItem('ocr-parsed-data') || '{}');
    const firstName = ocrData.firstName || '';
    const lastName = ocrData.lastName || '';
    const father = ocrData.father || '';
    const mother = ocrData.mother || '';
    const gender = ocrData.gender || '';
    const blood = ocrData.blood || '';
    const phone = ocrData.phone || '';
    const idNumber = ocrData.idNumber || '';

    return shell('ocr-details', `${heading('Additional details', 'Complete the remaining information before you save this verified student record.', `<a class="button" href="${pagePath('ocr-review')}">Back</a><button class="button button--primary" type="submit" form="ocr-additional-form">Save student</button>`)}<div class="form-layout"><form class="card" id="ocr-additional-form"><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Admission & contact</h2><p>These details were not present in the uploaded document.</p></div><div class="form-grid--two">${field('Admission date *', 'admissionDate', '', 'date', '', new Date().toISOString().slice(0, 10))}${field('Mother name', 'mother', 'e.g. Priya Sharma', 'text', '', mother)}${field('Mobile number *', 'phone', 'e.g. +91 98221 40393', 'tel', '', phone)}${field('Email address', 'email', 'parent@example.com', 'email')}<label class="field"><span class="field__label">Class / grade *</span><select class="select" name="grade"><option>Grade 6</option><option>Grade 7</option><option selected>Grade 8</option><option>Grade 9</option></select></label><label class="field"><span class="field__label">Section *</span><select class="select" name="section"><option selected>A</option><option>B</option><option>C</option></select></label><label class="field form-span-all"><span class="field__label">Address</span><textarea class="textarea" name="address" placeholder="Street address, city, state, postcode"></textarea></label></div></section><section class="form-section"><div class="form-section__heading"><h2 class="card__title">Final verification</h2><p>You’re about to create the student record. It can be updated later by authorized staff.</p></div><label class="checkbox"><input type="checkbox" required><span>I confirm the information is accurate and complete.</span></label></section><input type="hidden" name="firstName" value="${firstName}"><input type="hidden" name="lastName" value="${lastName}"><input type="hidden" name="father" value="${father}"><input type="hidden" name="gender" value="${gender}"><input type="hidden" name="blood" value="${blood}"><input type="hidden" name="idNumber" value="${idNumber}"><input type="hidden" name="dob" value="${ocrData.dob || ''}"></form>${steps(3, true)}</div>`);
  }

  function documentsPage() {
    const docs = [
      ['Admission form', 'Aarav Sharma', 'PDF · 1.8 MB', 'Verified'],
      ['Birth certificate', 'Ananya Iyer', 'PDF · 860 KB', 'Verified'],
      ['Medical record', 'Vihaan Mehta', 'JPG · 2.1 MB', 'Pending'],
      ['Transfer certificate', 'Mira Nair', 'PDF · 1.2 MB', 'Pending'],
      ['Address proof', 'Kabir Singh', 'PDF · 480 KB', 'Verified'],
      ['Immunization record', 'Diya Patel', 'JPG · 1.5 MB', 'Verified']
    ];
    return shell('documents', `${heading('Documents', 'A focused workspace for reviewing, validating, and organizing student files.', `<a class="button" href="${pagePath('ocr-upload')}">${icon('scan')}Smart upload</a>`)}<section class="card"><div class="table-toolbar"><label class="input-group table-toolbar__search">${icon('search')}<input class="input" type="search" placeholder="Search documents or students" data-document-search></label><div class="table-toolbar__actions"><button class="button button--sm" type="button" data-filter-docs>${icon('filter')}Status: All</button></div></div><div class="card__body"><div class="document-grid" id="document-grid">${docs.map(([name, student, meta, status]) => `<article class="card document-card card--interactive" data-document="${name.toLowerCase()} ${student.toLowerCase()}"><div class="document-card__preview">${icon('file')}</div><div class="document-card__body"><div class="document-card__title-line"><h2 class="document-card__title">${name}</h2>${statusBadge(status)}</div><div class="document-card__meta"><span>${student}</span><span>${meta}</span></div></div></article>`).join('')}</div></div></section>`);
  }

  function reportsPage() {
    return shell('reports', `${heading('Reports', 'A clear view of admissions, record health, and student demographics.', `<button class="button" type="button" data-report-email>${icon('mail')}Email report</button><button class="button" type="button" data-report-print>${icon('printer')}Print</button><button class="button button--primary" type="button" data-report-export>${icon('download')}Export</button>`)}<section class="card"><div class="filter-row"><label class="field"><span class="field__label">Report period</span><select class="select"><option>Last 6 months</option><option>Last 12 months</option><option>Academic year</option></select></label><label class="field"><span class="field__label">Grade</span><select class="select"><option>All grades</option><option>Grade 6</option><option>Grade 7</option><option>Grade 8</option></select></label><label class="field"><span class="field__label">Status</span><select class="select"><option>All statuses</option><option>Active</option><option>Pending</option></select></label><button class="button button--sm" type="button" data-apply-report>Apply filters</button></div></section><div class="report-grid section-gap"><article class="card report-card"><span class="eyebrow">Admissions</span><div class="report-card__value">248</div><p class="report-card__caption"><span class="trend--up">↑ 12.4%</span> compared to prior period</p></article><article class="card report-card"><span class="eyebrow">Active records</span><div class="report-card__value">1,190</div><p class="report-card__caption">92.7% of all student records</p></article><article class="card report-card"><span class="eyebrow">Document completion</span><div class="report-card__value">96.8%</div><p class="report-card__caption">18 records need attention</p></article></div><div class="dashboard-grid dashboard-grid--lower"><section class="card chart-card"><header class="card__header"><div><h2 class="card__title">Admissions trend</h2><p class="card__caption">New student records created each month</p></div></header><div class="chart-card__body">${admissionsChart()}</div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Gender distribution</h2><p class="card__caption">Across active student records</p></div></header><div class="card__body"><div class="distribution"><div class="distribution__row"><span class="distribution__label">Female</span><div class="progress"><div class="progress__bar progress__bar--49"></div></div><span class="distribution__value">49%</span></div><div class="distribution__row"><span class="distribution__label">Male</span><div class="progress"><div class="progress__bar progress__bar--48"></div></div><span class="distribution__value">48%</span></div><div class="distribution__row"><span class="distribution__label">Other</span><div class="progress"><div class="progress__bar progress__bar--3"></div></div><span class="distribution__value">3%</span></div></div></div></section></div><div class="dashboard-grid dashboard-grid--lower"><section class="card"><header class="card__header"><div><h2 class="card__title">Blood group distribution</h2><p class="card__caption">Useful for medical readiness</p></div></header><div class="card__body"><div class="distribution">${[['O+', 36], ['B+', 29], ['A+', 22], ['AB+', 13]].map(([group, value]) => `<div class="distribution__row"><span class="distribution__label">${group}</span><div class="progress"><div class="progress__bar progress__bar--${value}"></div></div><span class="distribution__value">${value}%</span></div>`).join('')}</div></div></section><section class="card"><header class="card__header"><div><h2 class="card__title">Record health</h2><p class="card__caption">Completeness and verification state</p></div></header><div class="card__body"><div class="distribution"><div class="distribution__row"><span class="distribution__label">Verified</span><div class="progress"><div class="progress__bar progress__bar--93"></div></div><span class="distribution__value">93%</span></div><div class="distribution__row"><span class="distribution__label">In review</span><div class="progress"><div class="progress__bar progress__bar--5"></div></div><span class="distribution__value">5%</span></div><div class="distribution__row"><span class="distribution__label">Missing</span><div class="progress"><div class="progress__bar progress__bar--2"></div></div><span class="distribution__value">2%</span></div></div></div></section></div>`);
  }

  function exportPage() {
    const students = getStudents();
    const totalStudents = students.length;
    const pendingCount = students.filter(s => s.status === 'Pending').length;

    return shell('export', `${heading('Export centre', 'Create an export that is scoped to exactly the records you need.', `<a class="button button--ghost" href="${pagePath('students')}">Back to students</a>`)}<div class="form-layout"><section class="card"><div class="form-section"><div class="form-section__heading"><h2 class="card__title">Configure your export</h2><p>Select the data, format, and delivery for a secure, reusable export.</p></div><div class="form-grid--two"><label class="field"><span class="field__label">Records</span><select class="select"><option>All active students (${totalStudents})</option><option>Students with pending documents (${pendingCount})</option><option>Selected student records</option></select></label><label class="field"><span class="field__label">Format</span><select class="select"><option>Excel workbook (.xlsx)</option><option>CSV file (.csv)</option><option>PDF summary (.pdf)</option></select></label><label class="field"><span class="field__label">Include fields</span><select class="select"><option>Core record details</option><option>Complete record details</option><option>Medical information only</option></select></label><label class="field"><span class="field__label">Delivery</span><select class="select"><option>Download now</option><option>Email a secure link</option></select></label></div></div><div class="form-section"><div class="form-section__heading"><h2 class="card__title">Privacy controls</h2><p>Limit sensitive data to the people who need it.</p></div><label class="switch"><input type="checkbox" checked><span class="switch__track"></span>Mask contact phone numbers</label><label class="switch"><input type="checkbox"><span class="switch__track"></span>Include medical information</label></div><div class="form-section"><button class="button button--primary" type="button" data-create-export>${icon('download')}Create export</button></div></section><aside class="card form-aside"><div class="card__header"><div><h2 class="card__title">Export summary</h2></div></div><div class="card__body"><div class="detail-list detail-list--single"><div class="detail-row"><span>Estimated records</span><b>${totalStudents} students</b></div><div class="detail-row"><span>Estimated size</span><b>~ 2.4 MB</b></div><div class="detail-row"><span>Data access</span><b>Administrators only</b></div></div><div class="card__caption card__caption--spaced">Exports are logged in your activity history for auditability.</div></div></aside></div>`);
  }

  function settingsPage() {
    const orgName = localStorage.getItem('orbit-org-name') || 'An Organisation';
    const orgCode = localStorage.getItem('orbit-org-code') || 'ORG-IND-01';
    const orgEmail = localStorage.getItem('orbit-org-email') || 'admin@organisation.org';
    const orgTimezone = localStorage.getItem('orbit-org-timezone') || 'Asia / Kolkata';

    return shell('settings', `${heading('Settings', 'Keep your workspace secure, consistent, and ready for your organisation.', `<button class="button button--primary" type="button" data-save-settings>Save changes</button>`)}<div class="settings-layout"><nav class="card settings-nav" aria-label="Settings sections"><button type="button" class="active">Workspace</button><button type="button">Profile & team</button><button type="button">Student fields</button><button type="button">Notifications</button><button type="button">Security</button></nav><section class="card settings-panel"><h2>Workspace</h2><p class="muted">Manage the details that appear across your workspace.</p><div class="form-grid--two form-gap">${field('Organisation name', 'schoolName', 'An Organisation', 'text', '', orgName)}${field('Organisation code', 'schoolCode', 'ORG-IND-01', 'text', '', orgCode)}${field('Primary contact email', 'contact', 'admin@organisation.org', 'email', '', orgEmail)}${field('Timezone', 'timezone', 'Asia / Kolkata', 'text', '', orgTimezone)}</div><div class="settings-row"><div><b>Admission notifications</b><p>Notify administrators when a new record is added.</p></div><label class="switch"><input type="checkbox" checked><span class="switch__track"></span><span class="sr-only">Admission notifications</span></label></div><div class="settings-row"><div><b>Document review reminders</b><p>Send a weekly reminder for records awaiting verification.</p></div><label class="switch"><input type="checkbox" checked><span class="switch__track"></span><span class="sr-only">Document review reminders</span></label></div><div class="settings-row"><div><b>Two-factor authentication</b><p>Require administrators to use an additional security step at sign in.</p></div><button class="button button--sm" type="button" data-2fa>Configure</button></div></section></div>`);
  }

  function renderPage(page) {
    const pages = { login: loginPage, dashboard: dashboardPage, students: studentsPage, 'student-profile': profilePage, 'add-student': addStudentPage, 'ocr-upload': ocrUploadPage, 'ocr-processing': ocrProcessingPage, 'ocr-review': ocrReviewPage, 'ocr-details': ocrDetailsPage, documents: documentsPage, reports: reportsPage, export: exportPage, settings: settingsPage };
    return (pages[page] || dashboardPage)();
  }

  function searchStudents(query) {
    const term = query.trim().toLowerCase();
    return getStudents().filter((student) => !term || Object.values(student).some((value) => String(value).toLowerCase().includes(term)));
  }

  function globalSearchMarkup(query = '') {
    const results = searchStudents(query).slice(0, 5);
    return `<div class="modal-backdrop" role="presentation"><section class="modal global-search" role="dialog" aria-modal="true" aria-labelledby="search-title"><header class="global-search__input"><span>${icon('search')}</span><input id="global-search-input" class="input" value="${query}" placeholder="Search students, parents, blood group…" aria-label="Search all student records" autofocus><kbd>Esc</kbd></header><div class="global-search__results"><p class="global-search__hint" id="search-title">Search across all student records</p>${results.length ? results.map((student) => `<a class="global-search__result" href="${pagePath('student-profile')}?id=${student.id}"><span class="table-avatar">${initials(student.name)}</span><span><b>${student.name}</b><small>${student.id} · ${student.class} · ${student.blood}</small></span><span class="global-search__go">${icon('arrowRight')}</span></a>`).join('') : '<div class="empty-state"><span class="empty-state__icon">'+icon('search')+'</span><h3>No matching records</h3><p>Try a name, parent, phone number, admission ID, or blood group.</p></div>'}</div></section></div>`;
  }

  function toast(title, message = 'Your changes have been saved.') {
    const root = document.querySelector('#toast-root');
    if (!root) return;
    const element = document.createElement('div');
    element.className = 'toast';
    element.innerHTML = `<span class="toast__icon">${icon('check')}</span><div><div class="toast__title">${title}</div><div class="toast__message">${message}</div></div><button class="icon-button icon-button--small" type="button" aria-label="Dismiss notification">${icon('x')}</button>`;
    root.append(element);
    const remove = () => element.remove();
    element.querySelector('button').addEventListener('click', remove);
    window.setTimeout(remove, 4200);
  }

  function closeModal() { document.querySelector('#modal-root').replaceChildren(); }

  function modal({ title, body, confirmText = 'Confirm', confirmClass = 'button--primary', onConfirm }) {
    const root = document.querySelector('#modal-root');
    root.innerHTML = `<div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal__header"><div><h2 id="modal-title" class="modal__title">${title}</h2></div><button class="icon-button icon-button--small" type="button" aria-label="Close dialog" data-modal-close>${icon('x')}</button></header><div class="modal__body">${body}</div><footer class="modal__footer"><button class="button" type="button" data-modal-close>Cancel</button><button class="button ${confirmClass}" type="button" data-modal-confirm>${confirmText}</button></footer></section></div>`;
    root.querySelectorAll('[data-modal-close]').forEach((button) => button.addEventListener('click', closeModal));
    root.querySelector('.modal-backdrop').addEventListener('click', (event) => { if (event.target === event.currentTarget) closeModal(); });
    root.querySelector('[data-modal-confirm]').addEventListener('click', () => { onConfirm?.(); closeModal(); });
    root.querySelector('[data-modal-close]')?.focus();
  }

  function collectStudent(form) {
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

  function saveStudent(form) {
    return updateStudent(collectStudent(form));
  }

  let activeSort = { field: 'admission', direction: 'desc' };
  let activeDocFilter = 'All';
  let currentPage = 1;
  const itemsPerPage = 5;

  // ─── Authentication Guard ───
  const isLoggedIn = localStorage.getItem('orbit-logged-in') === 'true';
  const page = document.body.dataset.page || 'dashboard';

  if (!isLoggedIn && page !== 'login') {
    window.location.href = pagePath('login');
  } else if (isLoggedIn && page === 'login') {
    window.location.href = pagePath('dashboard');
  } else {
    // Render the active page
    const app = document.querySelector('#app');
    if (app) {
      app.innerHTML = renderPage(page);
    }

    // Initialize interactive chart if on dashboard or reports
    if (page === 'dashboard' || page === 'reports') {
      initChart();
    }

    // Initialize Column Resize functionality on tables
    enableColumnResize();

    // ─── Event Listeners ───

    // Document Clicks
    document.addEventListener('click', (event) => {
      const target = event.target.closest('button, a, input[data-global-search], [data-upload-zone], [data-close-sidebar], [data-topbar-back]');
      if (!target) return;

      if (target.matches('[data-topbar-back]')) {
        const prevPageMap = {
          'student-profile': 'students',
          'add-student': 'students',
          'ocr-review': 'ocr-upload',
          'ocr-details': 'ocr-review',
          'ocr-processing': 'ocr-upload',
          'students': 'dashboard',
          'documents': 'dashboard',
          'reports': 'dashboard',
          'export': 'dashboard',
          'settings': 'dashboard'
        };
        const prev = prevPageMap[page] || 'dashboard';
        window.location.href = pagePath(prev);
      }

      if (target.matches('[data-collapse-sidebar]')) document.querySelector('.app-shell').classList.toggle('sidebar-collapsed');
      if (target.matches('[data-open-sidebar]')) { document.querySelector('.app-shell').classList.add('sidebar-open'); document.querySelector('.mobile-backdrop').hidden = false; }
      if (target.matches('[data-close-sidebar]')) { document.querySelector('.app-shell').classList.remove('sidebar-open'); target.hidden = true; }
      if (target.matches('[data-theme-toggle]')) setTheme(!document.body.classList.contains('theme-dark'));
      if (target.matches('[data-notifications]')) toast('You’re all caught up', 'No new notifications need your attention.');
      if (target.matches('[data-profile-menu]')) { const dropdown = document.querySelector('[data-profile-dropdown]'); const visible = dropdown.hidden; dropdown.hidden = !visible; target.setAttribute('aria-expanded', String(visible)); }
      
      if (target.matches('[data-sign-out]')) {
        localStorage.removeItem('orbit-logged-in');
        toast('Signed out', 'You have securely signed out of your workspace.');
        window.setTimeout(() => { window.location.href = pagePath('login'); }, 850);
      }

      if (target.closest('[data-google-login]')) {
        toast('Connecting to Google...', 'Redirecting to secure single sign-on.');
        window.setTimeout(() => {
          localStorage.setItem('orbit-logged-in', 'true');
          toast('Google Login Successful', 'Logged in as Aarushi (admin-orbit@gmail.com).');
          window.setTimeout(() => { window.location.href = pagePath('dashboard'); }, 850);
        }, 1200);
      }

      if (target.matches('[data-global-search]')) openGlobalSearch();
      if (target.matches('[data-filter-toggle]')) { const row = document.querySelector('[data-filter-row]'); row.hidden = !row.hidden; }
      if (target.matches('[data-sort]')) { const field = target.dataset.sort; activeSort = { field, direction: activeSort.field === field && activeSort.direction === 'asc' ? 'desc' : 'asc' }; applyTableFilters(); }
      if (target.matches('[data-clear-filters]')) { document.querySelectorAll('[data-filter-status], [data-filter-grade], [data-filter-blood]').forEach((input) => { input.value = ''; }); applyTableFilters(); }
      
      if (target.matches('[data-delete]')) {
        const id = target.dataset.delete;
        const student = getStudents().find((item) => item.id === id);
        modal({ title: `Remove ${student?.name || 'student'}?`, body: 'This removes the student record from this demo workspace. This action cannot be undone.', confirmText: 'Remove student', confirmClass: 'button--danger', onConfirm: () => { deleteStudent(id); applyTableFilters(); toast('Student removed', 'The record has been removed from this workspace.'); } });
      }

      if (target.matches('[data-edit]')) {
        const id = target.dataset.edit;
        window.location.href = `${pagePath('add-student')}?method=manual&edit=${id}`;
      }

      if (target.matches('#btn-prev')) {
        if (currentPage > 1) {
          currentPage--;
          applyTableFilters();
        }
      }
      if (target.matches('#btn-next')) {
        const students = filteredStudents();
        const totalPages = Math.ceil(students.length / itemsPerPage) || 1;
        if (currentPage < totalPages) {
          currentPage++;
          applyTableFilters();
        }
      }

      const docCard = target.closest('[data-student-id]');
      if (docCard && !target.matches('button, a')) {
        const studentId = docCard.dataset.studentId;
        window.location.href = `${pagePath('student-profile')}?id=${studentId}`;
      }

      if (target.matches('[data-bulk-export], [data-report-export], [data-create-export]')) {
        exportStudentsToExcel();
      }

      if (target.matches('[data-report-email]')) toast('Report queued for email', 'A secure report link will be delivered to your inbox.');
      if (target.matches('[data-report-print], [data-profile-print]')) window.print();
      if (target.matches('[data-apply-report]')) toast('Report updated', 'Your report now reflects the selected filters.');
      
      if (target.matches('[data-save-settings]')) {
        const orgNameInput = document.querySelector('input[name="schoolName"]')?.value.trim() || 'An Organisation';
        const orgCodeInput = document.querySelector('input[name="schoolCode"]')?.value.trim() || 'ORG-IND-01';
        const orgEmailInput = document.querySelector('input[name="contact"]')?.value.trim() || 'admin@organisation.org';
        const orgTimezoneInput = document.querySelector('input[name="timezone"]')?.value.trim() || 'Asia / Kolkata';

        localStorage.setItem('orbit-org-name', orgNameInput);
        localStorage.setItem('orbit-org-code', orgCodeInput);
        localStorage.setItem('orbit-org-email', orgEmailInput);
        localStorage.setItem('orbit-org-timezone', orgTimezoneInput);

        toast('Settings saved', 'Your workspace preferences are up to date.');
        window.setTimeout(() => { window.location.reload(); }, 600);
      }

      if (target.matches('[data-2fa]')) toast('Security configuration', 'Two-factor authentication configuration would open here.');
      if (target.matches('[data-upload-document]')) toast('Choose a document', 'Use Smart Upload for guided document extraction.');
      
      if (target.matches('[data-filter-docs]')) {
        const statuses = ['All', 'Pending', 'Verified'];
        const currIdx = statuses.indexOf(activeDocFilter);
        activeDocFilter = statuses[(currIdx + 1) % statuses.length];
        target.innerHTML = `${icon('filter')}Status: ${activeDocFilter}`;
        applyDocumentFilters();
      }

      if (target.matches('[data-activity]')) toast('Activity feed', 'Your activity history is up to date.');
      if (target.matches('[data-start-ocr]')) document.querySelector('[data-upload-input]')?.click();
      if (target.matches('[data-upload-zone]')) document.querySelector('[data-upload-input]')?.click();
      if (target.matches('[data-ocr-back]')) window.history.back();

      if (target.matches('[data-ocr-continue]')) {
        if (document.querySelector('[data-ocr-confirm]')?.checked) {
          // Collect edited values from the review page forms
          const ocrData = JSON.parse(localStorage.getItem('ocr-parsed-data') || '{}');
          const formFields = document.querySelectorAll('form.card input, form.card select');
          formFields.forEach(field => {
            if (field.name) {
              ocrData[field.name] = field.value;
            }
          });
          localStorage.setItem('ocr-parsed-data', JSON.stringify(ocrData));
          window.location.href = pagePath('ocr-details');
        } else {
          toast('Review required', 'Confirm that you have checked the extracted details before continuing.');
        }
      }

      if (target.matches('[data-ocr-rotate], [data-ocr-rotate] *')) {
        const img = document.querySelector('.document-preview-img');
        if (img) {
          let rotation = parseInt(img.dataset.rotation || '0', 10);
          rotation = (rotation + 90) % 360;
          img.dataset.rotation = String(rotation);
          img.style.transform = `rotate(${rotation}deg)`;
        } else {
          toast('Preview not active', 'No document image is currently loaded to rotate.');
        }
      }

      if (target.matches('[data-ocr-fullscreen], [data-ocr-fullscreen] *')) {
        const wrapper = document.querySelector('.document-preview-img-wrap') || document.querySelector('.document-sheet');
        if (wrapper) {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            wrapper.requestFullscreen?.() || wrapper.webkitRequestFullscreen?.() || wrapper.msRequestFullscreen?.();
          }
        } else {
          toast('Preview not active', 'No document preview is loaded to maximize.');
        }
      }

      if (target.matches('.accordion__trigger')) target.closest('.accordion__item').classList.toggle('is-open');
      if (target.matches('.tab')) {
        target.closest('.tabs').querySelectorAll('.tab').forEach((tab) => {
          tab.classList.toggle('tab--active', tab === target);
          tab.setAttribute('aria-selected', String(tab === target));
        });
      }
      if (target.closest('.settings-nav button')) {
        target.closest('.settings-nav').querySelectorAll('button').forEach((button) => button.classList.toggle('active', button === target));
        toast(`${target.textContent.trim()} settings`, 'This section is ready for configuration.');
      }
    });

    // Inputs
    document.addEventListener('input', (event) => {
      if (event.target.matches('#student-search, [data-filter-status], [data-filter-grade], [data-filter-blood]')) {
        currentPage = 1;
        applyTableFilters();
      }
      if (event.target.matches('[data-document-search]')) applyDocumentFilters();
    });

    // Changes
    document.addEventListener('change', (event) => {
      if (event.target.matches('[data-filter-status], [data-filter-grade], [data-filter-blood]')) {
        currentPage = 1;
        applyTableFilters();
      }
      if (event.target.matches('#select-all')) document.querySelectorAll('[data-select-row]').forEach((input) => { input.checked = event.target.checked; });
      if (event.target.matches('[data-upload-input]') && event.target.files?.length) {
        processUploadedFile(event.target.files[0]);
      }
    });

    // Drag & Drop
    document.addEventListener('dragover', (event) => {
      const zone = event.target.closest('[data-upload-zone]');
      if (zone) {
        event.preventDefault();
        zone.classList.add('is-dragging');
      }
    });

    document.addEventListener('dragleave', (event) => {
      const zone = event.target.closest('[data-upload-zone]');
      if (zone && !zone.contains(event.relatedTarget)) {
        zone.classList.remove('is-dragging');
      }
    });

    document.addEventListener('drop', (event) => {
      const zone = event.target.closest('[data-upload-zone]');
      if (zone) {
        event.preventDefault();
        zone.classList.remove('is-dragging');
        if (event.dataTransfer.files?.length) {
          processUploadedFile(event.dataTransfer.files[0]);
        }
      }
    });

    // Form Submissions
    document.querySelector('#student-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const student = saveStudent(form);
      toast('Student saved', `${student.name}’s record is ready.`);
      window.setTimeout(() => { window.location.href = `${pagePath('student-profile')}?id=${student.id}`; }, 500);
    });

    document.querySelector('#ocr-additional-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const student = saveStudent(form);
      logActivity('doc_processed', student.name, 'OCR-verified student saved');
      addPendingDoc('Student record', student.name);
      toast('Verified student saved', `${student.name}’s record is now active.`);
      window.setTimeout(() => { window.location.href = `${pagePath('student-profile')}?id=${student.id}`; }, 500);
    });

    document.querySelector('[data-login-form]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const adminIdInput = event.target.querySelector('[data-admin-id-input]')?.value.trim();
      if (adminIdInput === 'admin-ngo') {
        localStorage.setItem('orbit-logged-in', 'true');
        toast('Login Successful', 'Welcome to the Orbit school workspace.');
        window.setTimeout(() => { window.location.href = pagePath('dashboard'); }, 850);
      } else {
        toast('Access Denied', 'Incorrect Admin User ID. Please check the demo credentials.');
      }
    });

    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openGlobalSearch(); }
      if (event.key === 'Escape') closeModal();
    });

    // OCR processing backend fetch logic
    if (page === 'ocr-processing') {
      const fileData = localStorage.getItem('ocr-upload-file');
      const fileName = localStorage.getItem('ocr-upload-filename') || 'document.png';
      const fileType = localStorage.getItem('ocr-upload-filetype') || 'image/png';

      if (fileData) {
        const progressBar = document.querySelector('.ocr-progress-bar');
        const progressPctText = document.querySelector('.ocr-progress-pct');
        let currentProgress = 0;
        
        // Simulate progress bar going from 0 to 90% while uploading
        const progressTimer = window.setInterval(() => {
          if (currentProgress < 90) {
            currentProgress += Math.floor(Math.random() * 8) + 2;
            if (currentProgress > 90) currentProgress = 90;
            if (progressBar) progressBar.style.width = `${currentProgress}%`;
            if (progressPctText) progressPctText.textContent = `${currentProgress}%`;
          }
        }, 200);

        fetch(fileData)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], fileName, { type: fileType });
            const formData = new FormData();
            formData.append('document', file);

            const startTime = Date.now();

            // Submit to server running on port 3000
            fetch('/api/ocr', {
              method: 'POST',
              body: formData
            })
              .then(response => {
                if (!response.ok) throw new Error('OCR API failed');
                return response.json();
              })
              .then(result => {
                window.clearInterval(progressTimer);
                if (result.success) {
                  // Complete progress bar
                  if (progressBar) progressBar.style.width = '100%';
                  if (progressPctText) progressPctText.textContent = '100%';

                  localStorage.setItem('ocr-parsed-data', JSON.stringify(result.data));
                  const name = [result.data.firstName, result.data.lastName].filter(Boolean).join(' ') || 'Unknown';
                  logActivity('doc_processed', name, 'Document extracted via OCR');
                  
                  const elapsed = Date.now() - startTime;
                  const remaining = Math.max(0, 1000 - elapsed);
                  window.setTimeout(() => {
                    window.location.href = pagePath('ocr-review');
                  }, remaining);
                } else {
                  throw new Error(result.error || 'Extraction failed');
                }
              })
              .catch(err => {
                window.clearInterval(progressTimer);
                console.error('Live OCR failed:', err);
                localStorage.removeItem('ocr-parsed-data');
                
                // Show an error modal
                modal({
                  title: 'Extraction Failed',
                  body: '<p>The system could not identify or extract valid information from this document. Please ensure it is a clear scan of a supported document (e.g. Aadhaar Card, Birth Certificate).</p>',
                  confirmText: 'Try Again',
                  onConfirm: () => {
                    window.location.href = pagePath('ocr-upload');
                  }
                });

                // Visually indicate failure on the processing screen
                const processingContainer = document.querySelector('.ocr-processing');
                if (processingContainer) {
                  processingContainer.innerHTML = `<span class="ocr-processing__orbit" style="color:var(--color-danger)">${icon('alertCircle') || '⚠️'}</span><h2>Extraction failed</h2><p>Please try again with a clearer image.</p>`;
                }
              });
          });
      } else {
        window.setTimeout(() => { window.location.href = pagePath('ocr-review'); }, 1850);
      }
    }
  }

  // ─── Core Helpers ───

  function enableColumnResize() {
    document.querySelectorAll('th[data-resizable]').forEach((header) => {
      if (header.querySelector('.column-resizer')) return;
      const handle = document.createElement('button');
      handle.className = 'column-resizer';
      handle.type = 'button';
      handle.setAttribute('aria-label', `Resize ${header.textContent.trim()} column`);
      header.append(handle);
      handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = header.getBoundingClientRect().width;
        const resize = (moveEvent) => { header.style.width = `${Math.max(120, startWidth + moveEvent.clientX - startX)}px`; };
        const stop = () => { document.removeEventListener('pointermove', resize); document.removeEventListener('pointerup', stop); };
        document.addEventListener('pointermove', resize);
        document.addEventListener('pointerup', stop);
      });
    });
  }

  function setTheme(isDark) {
    document.body.classList.toggle('theme-dark', isDark);
    localStorage.setItem('orbit-theme', isDark ? 'dark' : 'light');
  }

  setTheme(localStorage.getItem('orbit-theme') === 'dark');

  function openGlobalSearch(query = '') {
    const root = document.querySelector('#modal-root');
    if (!root) return;
    root.innerHTML = globalSearchMarkup(query);
    const input = root.querySelector('#global-search-input');
    if (input) {
      input.focus();
      input.select();
      input.addEventListener('input', () => openGlobalSearch(input.value));
    }
    root.querySelector('.modal-backdrop')?.addEventListener('click', (event) => { if (event.target === event.currentTarget) closeModal(); });
  }

  function filteredStudents() {
    const query = document.querySelector('#student-search')?.value || '';
    const status = document.querySelector('[data-filter-status]')?.value || '';
    const grade = document.querySelector('[data-filter-grade]')?.value || '';
    const blood = document.querySelector('[data-filter-blood]')?.value || '';
    return searchStudents(query).filter((student) => (!status || student.status === status) && (!grade || student.class.includes(grade)) && (!blood || student.blood === blood));
  }

  function applyTableFilters() {
    const students = filteredStudents().sort((a, b) => String(a[activeSort.field] || '').localeCompare(String(b[activeSort.field] || '')) * (activeSort.direction === 'asc' ? 1 : -1));
    
    const totalItems = students.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const paginated = students.slice(start, start + itemsPerPage);

    updateStudentTable(paginated);

    // Update pagination controls
    const countSpan = document.getElementById('student-count');
    if (countSpan) {
      countSpan.textContent = `${totalItems} students (Page ${currentPage} of ${totalPages})`;
    }

    const btnPrev = document.getElementById('btn-prev');
    if (btnPrev) {
      btnPrev.disabled = currentPage === 1;
    }

    const btnNext = document.getElementById('btn-next');
    if (btnNext) {
      btnNext.disabled = currentPage === totalPages;
    }
  }

  function applyDocumentFilters() {
    const searchVal = document.querySelector('[data-document-search]')?.value.toLowerCase().trim() || '';
    document.querySelectorAll('.document-card').forEach((card) => {
      const text = card.dataset.document || '';
      const matchesSearch = text.includes(searchVal);
      const badge = card.querySelector('.badge');
      const statusBadgeText = badge ? badge.textContent.trim() : '';
      const matchesStatus = (activeDocFilter === 'All') || 
                            (activeDocFilter === 'Pending' && statusBadgeText.includes('Pending')) ||
                            (activeDocFilter === 'Verified' && (statusBadgeText.includes('Verified') || statusBadgeText.includes('Active')));
      card.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
    });
  }

  function processUploadedFile(file) {
    if (!file.type.startsWith('image/')) {
      toast('Unsupported file format', 'Please upload a clean image file (JPG or PNG).');
      return;
    }

    toast('Document received', 'Starting a secure draft extraction.');

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        try {
          const pngDataUrl = canvas.toDataURL('image/png');
          localStorage.setItem('ocr-upload-file', pngDataUrl);
          localStorage.setItem('ocr-upload-filename', file.name.replace(/\.[^/.]+$/, "") + '.png');
          localStorage.setItem('ocr-upload-filetype', 'image/png');
        } catch (err) {
          console.warn('Canvas conversion failed, saving original:', err);
          localStorage.setItem('ocr-upload-file', e.target.result);
          localStorage.setItem('ocr-upload-filename', file.name);
          localStorage.setItem('ocr-upload-filetype', file.type);
        }
        window.setTimeout(() => { window.location.href = pagePath('ocr-processing'); }, 500);
      };
      img.onerror = function () {
        console.warn('Image loading failed, saving original:', file.name);
        localStorage.setItem('ocr-upload-file', e.target.result);
        localStorage.setItem('ocr-upload-filename', file.name);
        localStorage.setItem('ocr-upload-filetype', file.type);
        window.setTimeout(() => { window.location.href = pagePath('ocr-processing'); }, 500);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ─── SheetJS Excel Export Logic ───
  function loadSheetJS(callback) {
    if (window.XLSX) {
      callback();
      return;
    }
    toast('Preparing export', 'Loading the secure Excel engine...');
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => callback();
    script.onerror = () => toast('Export failed', 'Could not load the Excel export library. Please check your internet connection.');
    document.head.appendChild(script);
  }

  function exportStudentsToExcel() {
    const students = getStudents();
    if (students.length === 0) {
      toast('No data to export', 'Add some student records first.');
      return;
    }

    loadSheetJS(() => {
      const data = students.map(s => ({
        'Student ID': s.id || '',
        'Name': s.name || '',
        'Email': s.email || '',
        'Class': s.class || '',
        'Gender': s.gender || '',
        'Blood Group': s.blood || '',
        'Father Name': s.father || '',
        'Mother Name': s.mother || '',
        'Phone Number': s.phone || '',
        'Admission Date': s.admission || '',
        'Address': s.address || '',
        'Internal Notes': s.notes || '',
        'Verification Status': s.status || 'Active'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Student Records");
      XLSX.writeFile(wb, "Orbit_Student_Records.xlsx");
      
      logActivity('export_created', 'Excel file', 'Exported all student data to Excel');
      toast('Export complete', 'Your student records Excel file has been downloaded.');
    });
  }

})();
