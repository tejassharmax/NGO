/**
 * assistant.js
 * "Ask Ayusha": a side panel where staff ask questions about this space's records.
 * The server runs the model and its read-only tools; this file only shows the
 * conversation and turns the children an answer names into links to their profiles.
 * The panel appears only when the server says the assistant is enabled.
 */

import { apiFetch } from './apiClient.js';
import { icon, escapeHTML, pagePath } from './utils.js';

const SUGGESTIONS = [
  'Which children are due for a checkup?',
  'Whose insurance expires in the next 60 days?',
  'Show Kavya Menon\'s hemoglobin over time',
  'What appointments are coming up?'
];

/** @type {{role: 'user'|'assistant', text: string, refs?: {id: string, name: string}[], error?: boolean}[]} */
let messages = [];
let busy = false;
let panel = null;

export async function initAssistant() {
  try {
    const res = await apiFetch('/api/assistant/status');
    if (!res.ok) return;
    const { enabled } = await res.json();
    if (!enabled) return;
  } catch {
    return;
  }
  document.body.classList.add('assistant-on');
  buildPanel();
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-assistant-open]')) togglePanel();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel && !panel.hidden) closePanel();
  });
}

function buildPanel() {
  panel = document.createElement('aside');
  panel.id = 'assistant-panel';
  panel.className = 'assistant-panel';
  panel.setAttribute('aria-label', 'Ask Ayusha');
  panel.hidden = true;
  panel.innerHTML = `
    <header class="assistant-panel__head">
      <span class="assistant-panel__mark">${icon('sparkles')}</span>
      <div class="assistant-panel__title"><b>Ask Ayusha</b><span>Reads this space's records. It cannot change them.</span></div>
      <button class="icon-button" type="button" data-assistant-new aria-label="New conversation" title="New conversation">${icon('rotate')}</button>
      <button class="icon-button" type="button" data-assistant-close aria-label="Close">${icon('x')}</button>
    </header>
    <div class="assistant-panel__log" data-assistant-log aria-live="polite"></div>
    <form class="assistant-panel__form" data-assistant-form>
      <label class="sr-only" for="assistant-input">Your question</label>
      <textarea id="assistant-input" rows="1" maxlength="1000" placeholder="Ask about checkups, blood tests, insurance…" data-assistant-input></textarea>
      <button class="assistant-panel__send" type="submit" aria-label="Send">${icon('send')}</button>
    </form>
    <p class="assistant-panel__note">Answers come from the records but can still be wrong. Open the linked profile to check.</p>`;
  document.body.appendChild(panel);

  panel.querySelector('[data-assistant-close]').addEventListener('click', closePanel);
  panel.querySelector('[data-assistant-new]').addEventListener('click', () => {
    if (busy) return;
    messages = [];
    render();
    focusInput();
  });
  const input = panel.querySelector('[data-assistant-input]');
  input.addEventListener('input', () => autoGrow(input));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send(input.value);
    }
  });
  panel.querySelector('[data-assistant-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    send(input.value);
  });
  panel.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-assistant-suggest]');
    if (chip) send(chip.dataset.assistantSuggest);
    const retry = event.target.closest('[data-assistant-retry]');
    if (retry) retryLast();
    // On a phone the panel covers the page, so close it when a record is opened.
    if (event.target.closest('a[data-assistant-record]') && window.matchMedia('(max-width: 768px)').matches) closePanel();
  });
  render();
}

function togglePanel() {
  if (panel.hidden) openPanel();
  else closePanel();
}

function openPanel() {
  panel.hidden = false;
  document.body.classList.add('assistant-open');
  document.querySelectorAll('[data-assistant-open]').forEach(b => b.setAttribute('aria-expanded', 'true'));
  focusInput();
}

function closePanel() {
  panel.hidden = true;
  document.body.classList.remove('assistant-open');
  document.querySelectorAll('[data-assistant-open]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  document.querySelector('[data-assistant-open]')?.focus();
}

function focusInput() {
  panel.querySelector('[data-assistant-input]').focus();
}

function autoGrow(input) {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
}

async function send(raw) {
  const text = String(raw || '').trim();
  if (!text || busy) return;
  const input = panel.querySelector('[data-assistant-input]');
  input.value = '';
  autoGrow(input);
  messages.push({ role: 'user', text });
  await ask();
}

function retryLast() {
  if (busy) return;
  if (messages.length && messages[messages.length - 1].error) messages.pop();
  ask();
}

async function ask() {
  busy = true;
  render();
  const history = messages.filter(m => !m.error).slice(-10).map(({ role, text }) => ({ role, text }));
  try {
    const res = await apiFetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'The assistant could not answer right now.');
    messages.push({ role: 'assistant', text: String(body.answer || ''), refs: Array.isArray(body.refs) ? body.refs : [] });
  } catch (err) {
    messages.push({ role: 'assistant', text: err.message || 'The assistant could not answer right now.', error: true });
  } finally {
    busy = false;
    render();
  }
}

function render() {
  const log = panel.querySelector('[data-assistant-log]');
  if (!messages.length) {
    log.innerHTML = `
      <div class="assistant-empty">
        <p>Ask a question about the children in this space. Each child in an answer links to their profile.</p>
        <div class="assistant-empty__chips">${SUGGESTIONS.map(s => `<button type="button" class="assistant-chip" data-assistant-suggest="${escapeHTML(s)}">${escapeHTML(s)}</button>`).join('')}</div>
      </div>`;
  } else {
    log.innerHTML = messages.map(messageHTML).join('') +
      (busy ? '<div class="assistant-msg assistant-msg--bot assistant-msg--busy" role="status"><span></span><span></span><span></span><span class="sr-only">Looking through the records</span></div>' : '');
  }
  panel.querySelector('.assistant-panel__send').disabled = busy;
  log.scrollTop = log.scrollHeight;
}

function messageHTML(m) {
  if (m.role === 'user') return `<div class="assistant-msg assistant-msg--user">${escapeHTML(m.text)}</div>`;
  if (m.error) {
    return `<div class="assistant-msg assistant-msg--bot assistant-msg--error">${escapeHTML(m.text)} <button type="button" class="assistant-retry" data-assistant-retry>Try again</button></div>`;
  }
  const refs = m.refs || [];
  const records = refs.length
    ? `<div class="assistant-records"><span>Records</span>${refs.map(r => `<a class="assistant-record" data-assistant-record href="${recordHref(r.id)}">${escapeHTML(r.name)} <small>${escapeHTML(r.id)}</small></a>`).join('')}</div>`
    : '';
  return `<div class="assistant-msg assistant-msg--bot">${formatAnswer(m.text, refs)}${records}</div>`;
}

function recordHref(id) {
  return `${pagePath('child-profile')}?id=${encodeURIComponent(id)}`;
}

/**
 * Escapes the answer, links the children the server confirmed (refs), and applies
 * a small subset of formatting: **bold**, and "- " / "* " / "1. " list lines.
 */
function formatAnswer(text, refs) {
  const links = [];
  const token = (html) => `\u0000${links.push(html) - 1}\u0000`;
  let out = escapeHTML(text);

  // Longest names first, so "Kavya Menon" wins over a shorter name inside it.
  [...refs].sort((a, b) => b.name.length - a.name.length).forEach(r => {
    const name = escapeRegExp(escapeHTML(r.name));
    const id = escapeRegExp(escapeHTML(r.id));
    const link = (label) => token(`<a class="assistant-link" data-assistant-record href="${recordHref(r.id)}">${label}</a>`);
    out = out.replace(new RegExp(`${name}\\s*\\(${id}\\)`, 'g'), () => link(`${escapeHTML(r.name)} <small>${escapeHTML(r.id)}</small>`));
    out = out.replace(new RegExp(`\\b${id}\\b`, 'g'), () => link(escapeHTML(r.id)));
  });

  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');

  const lines = out.split('\n');
  let html = '';
  let list = null;
  for (const line of lines) {
    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (bullet) {
      if (!list) { html += '<ul>'; list = true; }
      html += `<li>${bullet[1]}</li>`;
      continue;
    }
    if (list) { html += '</ul>'; list = null; }
    if (line.trim()) html += `<p>${line}</p>`;
  }
  if (list) html += '</ul>';

  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => links[Number(i)]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
