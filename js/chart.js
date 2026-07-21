import { getStudents } from './storage.js';

export function getChartData() {
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

export function admissionsChart() {
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

export function initChart() {
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
