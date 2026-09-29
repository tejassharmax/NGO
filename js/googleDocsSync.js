/**
 * googleDocsSync.js
 * Real-time Executive Health Report synchronization to Google Docs.
 * Automatically formats and updates executive health summaries, audit statistics,
 * WHO growth metrics, and child clinical logs directly into the live Google Doc.
 */

import { getSession } from './session.js';
import { getChildren, getHealthRecords, healthStatus, calculateAge } from './storage.js';
import { apiFetch } from './apiClient.js';

let cachedDocsConfig = null;

/**
 * Fetch Docs config for the current NGO from backend API
 */
export async function fetchDocsConfig(ngoSlug) {
  const session = getSession() || {};
  const slug = String(ngoSlug || session.ngoSlug || session.ngo || 'ayusha-nilayam').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-') || 'ayusha-nilayam';
  try {
    const res = await apiFetch(`/api/docs/config?ngo=${encodeURIComponent(slug)}`);
    if (res.ok) {
      cachedDocsConfig = await res.json();
      return cachedDocsConfig;
    }
  } catch (err) {
    console.warn('[Google Docs] Config fetch warning:', err);
  }
  return cachedDocsConfig || { connected: false };
}

/**
 * Generate formatted executive report document text
 */
export function generateExecutiveDocContent() {
  const session = getSession() || {};
  const ngoName = session.ngo || 'Ayusha Nilayam';
  const children = getChildren() || [];
  const total = children.length;
  const flaggedCount = children.filter(c => healthStatus(c).level !== 'good').length;
  const healthyCount = total - flaggedCount;
  const healthyPct = total > 0 ? Math.round((healthyCount / total) * 100) : 0;
  const healthRecords = getHealthRecords() || [];

  const timestamp = new Date().toLocaleString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let reportText = `========================================================================\n`;
  reportText += `       EXECUTIVE CHILD HEALTH AUDIT REPORT — ${ngoName.toUpperCase()}\n`;
  reportText += `       Auto-Synced Live Document | ${timestamp}\n`;
  reportText += `========================================================================\n\n`;

  reportText += `1. EXECUTIVE HEALTH SUMMARY\n`;
  reportText += `------------------------------------------------------------------------\n`;
  reportText += `• Total Registered Children : ${total}\n`;
  reportText += `• Optimal Health Status     : ${healthyCount} children (${healthyPct}%)\n`;
  reportText += `• Health Alerts / Flagged   : ${flaggedCount} children\n`;
  reportText += `• Lab Test Reports on File  : ${healthRecords.length}\n\n`;

  reportText += `2. REGISTERED CHILD ROSTER & CLINICAL METRICS\n`;
  reportText += `------------------------------------------------------------------------\n`;
  reportText += `ID         | Name                     | Age | Gender | Status  | Height  | Weight  | Medications          | Hygiene\n`;
  reportText += `------------------------------------------------------------------------\n`;

  children.forEach(c => {
    const age = calculateAge(c.dob) || c.age || '—';
    const id = String(c.id || 'CH-0000').padEnd(10, ' ');
    const name = String(c.name || 'Child').slice(0, 24).padEnd(24, ' ');
    const ageStr = String(age).slice(0, 3).padEnd(4, ' ');
    const gender = String(c.gender || '—').slice(0, 6).padEnd(7, ' ');
    const status = String(c.status || 'Active').slice(0, 7).padEnd(8, ' ');
    const h = String(c.height ? `${c.height}cm` : '—').padEnd(8, ' ');
    const w = String(c.weight ? `${c.weight}kg` : '—').padEnd(8, ' ');
    const meds = String(c.medications || 'None').slice(0, 20).padEnd(20, ' ');
    const hygiene = String(c.hygieneIndex || 'N/A');

    reportText += `${id} | ${name} | ${ageStr} | ${gender} | ${status} | ${h} | ${w} | ${meds} | ${hygiene}\n`;
  });

  reportText += `\n------------------------------------------------------------------------\n`;
  reportText += `End of Live Synced Report | Child Health Management Platform\n`;

  return reportText;
}

/**
 * Automatically sync executive report to Google Docs in background via OAuth API
 */
export async function autoSyncToGoogleDocs() {
  const session = getSession() || {};
  const ngoSlug = String(session.ngoSlug || session.ngo || 'ayusha-nilayam').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-') || 'ayusha-nilayam';
  const ngoName = session.ngoName || session.ngo || 'Ayusha Nilayam';
  const reportContent = generateExecutiveDocContent();

  try {
    const res = await apiFetch('/api/docs/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportContent, ngo: ngoSlug, ngoName })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        if (data.documentUrl) {
          if (!cachedDocsConfig) cachedDocsConfig = { connected: true };
          cachedDocsConfig.connected = true;
          cachedDocsConfig.documentUrl = data.documentUrl;
        }
        console.log('[Google Docs] Executive report live synced.');
      } else if (data && data.message === 'Not connected') {
        console.log('[Google Docs] Skip auto-sync: NGO is not connected to Google Workspace.');
      }
    }
  } catch (err) {
    console.warn('[Google Docs] OAuth sync notice:', err);
  }
}
