/**
 * assistant.js
 * "Ask Ayusha": ask questions about this space's records. It opens over the
 * page beside the app's sidebar, growing out of the Ask Ayusha button. The
 * question box sits in the middle of an empty screen and moves to the bottom
 * once a conversation starts. Sources (the space's own workbooks and calendar)
 * are ticked from the box itself; the server reads only those and runs the model.
 * This file shows the conversation and links each person an answer names to
 * their profile. An answer that compares two readings per person
 * ("22.9 kg → 23.2 kg") is also plotted on one shared scale.
 * It appears only when the server says the assistant is enabled.
 */

import { apiFetch } from './apiClient.js';
import { icon, escapeHTML, pagePath } from './utils.js';
import { isFamilySpace } from './space.js';
import { getSession } from './session.js';

/** Ready-made report questions (the "3–4 reporting prompts"). */
function reports() {
  const family = isFamilySpace();
  const person = family ? 'family member' : 'child';
  const people = family ? 'family members' : 'children';
  return [
    { icon: 'ruler', label: 'Growth', detail: 'Height and weight, last month', prompt: `For every ${person}, show the height and weight change over the last one month.` },
    { icon: 'stethoscope', label: 'Checkups', detail: `Who has had no checkup in 6 months`, prompt: `Which ${people} have had no checkup in the last 6 months?` },
    { icon: 'activity', label: 'Blood tests', detail: 'Results from the last 3 months', prompt: 'List the blood test results from the last 3 months.' },
    { icon: 'calendar', label: 'Appointments', detail: 'Visits coming up in the next 30 days', prompt: 'What appointments are coming up in the next 30 days?' }
  ];
}

/** @type {{role: 'user'|'assistant', text: string, at?: number, refs?: {id: string, name: string}[], error?: boolean, stopped?: boolean, fresh?: boolean}[]} */
let messages = [];
/** The stored conversation this screen shows; null until its first answer is saved. */
let chatId = null;
/** @type {{id: string, title: string, updatedAt: number, count: number}[]|null} */
let chatList = null;
let historyError = '';
/** @type {{id: string, title: string, about: string, kind: string, origin: string, url: string|null}[]|null} */
let sources = null;
let sourcesError = '';
// Kept in memory only: nothing about Ask Ayusha is stored in the browser.
let selected = new Set();
let selectedChosen = false;
let busy = false;
let controller = null;
let startedAt = 0;
let clock = null;
let panel = null;
let closeTimer = null;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function initAssistant() {
  try {
    const res = await apiFetch('/api/assistant/status');
    if (!res.ok) return;
    const { enabled } = await res.json();
    if (!enabled) return;
  } catch {
    return;
  }
  // Earlier versions kept conversations in the tab's storage; remove anything they left.
  try { ['chm_assistant_history', 'chm_assistant_sources'].forEach(key => sessionStorage.removeItem(key)); } catch { /* storage blocked: nothing to remove */ }
  document.body.classList.add('assistant-on');
  buildPanel();
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-assistant-open]');
    if (trigger) togglePanel(trigger);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !panel || panel.hidden) return;
    if (busy) stop();
    else if (openPopover()) closePopovers();
    else closePanel();
  });
}

function buildPanel() {
  panel = document.createElement('aside');
  panel.id = 'assistant-panel';
  panel.className = 'ask';
  panel.setAttribute('aria-label', 'Ask Ayusha');
  panel.hidden = true;
  panel.innerHTML = `
    <header class="ask__head">
      <span class="ask__mark" aria-hidden="true">${icon('sparkles')}</span>
      <h2 class="ask__title">Ask Ayusha</h2>
      <span class="ask__tag">Preview</span>
      <span class="ask__spacer"></span>
      <div class="ask__pop-wrap">
        <button class="ask__btn" type="button" data-ask-pop="history" aria-haspopup="true" aria-expanded="false">${icon('clock')}<span>History</span></button>
        <div class="ask__pop ask__pop--history" data-ask-popover="history" hidden>
          <p class="ask__pop-title">Your conversations</p>
          <div class="ask__history" data-ask-history></div>
        </div>
      </div>
      <button class="ask__btn" type="button" data-ask-new>${icon('plus')}<span>New chat</span></button>
      <button class="ask__icon-btn" type="button" data-ask-close aria-label="Close Ask Ayusha">${icon('x')}</button>
    </header>
    <div class="ask__stage">
      <div class="ask__log" data-ask-log aria-live="polite"></div>
      <div class="ask__dock" data-ask-dock>
        <form class="ask__composer" data-ask-form>
          <label class="sr-only" for="assistant-input">Your question</label>
          <textarea id="assistant-input" rows="1" maxlength="1000" placeholder="Ask anything about your records" data-ask-input></textarea>
          <div class="ask__composer-row">
            <div class="ask__pop-wrap">
              <button type="button" class="ask__scope" data-ask-pop="sources" aria-haspopup="true" aria-expanded="false">${icon('googleSheets')}<span data-ask-scope>Loading sources</span>${icon('chevronDown')}</button>
              <div class="ask__pop ask__pop--sources" data-ask-popover="sources" hidden>
                <p class="ask__pop-title">Sources Ayusha can read <span data-ask-source-count></span></p>
                <div class="ask__sources" data-ask-source-list></div>
                <p class="ask__privacy">${icon('lock')}<span>Only ticked sources are read. ID numbers, phone numbers and email addresses are hidden from Ayusha.</span></p>
              </div>
            </div>
            <span class="ask__hint">Enter to send</span>
            <button class="ask__send" type="submit" data-ask-send aria-label="Send">${icon('arrowUp')}</button>
          </div>
        </form>
        <div class="ask__reports" data-ask-reports></div>
        <p class="ask__note">Answers come only from the ticked sources and can be wrong. Open the linked profile to check.</p>
      </div>
    </div>`;
  document.body.appendChild(panel);

  panel.querySelector('[data-ask-close]').addEventListener('click', closePanel);
  panel.querySelector('[data-ask-new]').addEventListener('click', newChat);

  const input = panel.querySelector('[data-ask-input]');
  input.addEventListener('input', () => autoGrow(input));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send(input.value);
    }
  });
  panel.querySelector('[data-ask-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    if (busy) stop();
    else send(input.value);
  });

  panel.addEventListener('change', (event) => {
    const box = event.target.closest('[data-ask-source]');
    if (!box) return;
    if (box.checked) selected.add(box.value); else selected.delete(box.value);
    selectedChosen = true;
    renderSources();
  });
  panel.addEventListener('click', (event) => {
    const pop = event.target.closest('[data-ask-pop]');
    if (pop) togglePopover(pop.dataset.askPop);
    else if (!event.target.closest('[data-ask-popover]')) closePopovers();
    const report = event.target.closest('[data-ask-suggest]');
    if (report) send(report.dataset.askSuggest);
    if (event.target.closest('[data-ask-retry]')) retryLast();
    if (event.target.closest('[data-ask-regenerate]')) regenerate();
    const copy = event.target.closest('[data-ask-copy]');
    if (copy) copyAnswer(copy);
    if (event.target.closest('[data-ask-sources-retry]')) loadSources(true);
    const gone = event.target.closest('[data-ask-history-delete]');
    if (gone) deleteConversation(gone.dataset.askHistoryDelete);
    const past = event.target.closest('[data-ask-history-item]');
    if (past) openConversation(past.dataset.askHistoryItem);
    // The page is covered while Ask Ayusha is open, so close it when a record is opened.
    if (event.target.closest('a[data-assistant-record]')) closePanel();
  });
  render();
}

/* ---------- Opening and closing ---------- */

function togglePanel(trigger) {
  if (panel.hidden || panel.classList.contains('ask--closing')) openPanel(trigger);
  else closePanel();
}

/** Ask Ayusha grows out of the button that opened it. */
function openPanel(trigger) {
  clearTimeout(closeTimer);
  panel.hidden = false;
  panel.classList.remove('ask--closing');
  const from = (trigger || document.querySelector('[data-assistant-open]'))?.getBoundingClientRect();
  const box = panel.getBoundingClientRect();
  if (from) {
    panel.style.setProperty('--ox', `${from.left + from.width / 2 - box.left}px`);
    panel.style.setProperty('--oy', `${from.top + from.height / 2 - box.top}px`);
  }
  panel.classList.remove('ask--opening');
  void panel.offsetWidth;
  panel.classList.add('ask--opening');
  document.body.classList.add('assistant-open');
  document.querySelectorAll('[data-assistant-open]').forEach(b => b.setAttribute('aria-expanded', 'true'));
  if (!messages.length) render();
  loadSources();
  focusInput();
}

function closePanel() {
  if (panel.hidden) return;
  closePopovers();
  const done = () => {
    panel.hidden = true;
    panel.classList.remove('ask--closing', 'ask--opening');
  };
  document.body.classList.remove('assistant-open');
  document.querySelectorAll('[data-assistant-open]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  if (reducedMotion()) done();
  else {
    panel.classList.remove('ask--opening');
    panel.classList.add('ask--closing');
    clearTimeout(closeTimer);
    closeTimer = setTimeout(done, 260);
  }
  document.querySelector('[data-assistant-open]')?.focus();
}

function openPopover() {
  return panel.querySelector('[data-ask-popover]:not([hidden])');
}

function togglePopover(name) {
  const target = panel.querySelector(`[data-ask-popover="${name}"]`);
  const wasOpen = !target.hidden;
  closePopovers();
  if (wasOpen) return;
  if (name === 'history') loadHistory();
  target.hidden = false;
  panel.querySelector(`[data-ask-pop="${name}"]`).setAttribute('aria-expanded', 'true');
}

function closePopovers() {
  panel.querySelectorAll('[data-ask-popover]').forEach(p => { p.hidden = true; });
  panel.querySelectorAll('[data-ask-pop]').forEach(b => b.setAttribute('aria-expanded', 'false'));
}

function focusInput() {
  if (window.matchMedia('(min-width: 821px)').matches) panel.querySelector('[data-ask-input]').focus({ preventScroll: true });
}

function autoGrow(input) {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 168)}px`;
  input.style.overflowY = input.scrollHeight > 168 ? 'auto' : 'hidden';
}

/** Runs a change that moves the question box (middle of the screen ↔ bottom) as one smooth move. */
function morph(change) {
  if (!document.startViewTransition || reducedMotion() || document.hidden) return change();
  // A transition the browser skips (for example in a background tab) still runs the change.
  const t = document.startViewTransition(change);
  t.ready.catch(() => {});
  t.finished.catch(() => {});
}

/* ---------- Sources ---------- */

async function loadSources(force = false) {
  if (sources && !force) return;
  sourcesError = '';
  sources = null;
  renderSources();
  try {
    const res = await apiFetch('/api/assistant/sources');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'The sources could not be loaded.');
    sources = Array.isArray(body.sources) ? body.sources : [];
    const ids = sources.map(s => s.id);
    // First visit in this tab: every source is ticked.
    // Every source starts ticked; a choice made earlier in this visit is kept.
    selected = selectedChosen ? new Set([...selected].filter(id => ids.includes(id))) : new Set(ids);
  } catch (err) {
    sourcesError = err.message || 'The sources could not be loaded.';
    sources = null;
  }
  renderSources();
}

const ticked = () => (sources || []).filter(s => selected.has(s.id));
/** "Ayusha Nilayam — Blood Test Reports" -> "Blood Test Reports" */
const shortTitle = s => String(s.title).split(' — ').pop();
const originLabel = s => (s.origin === 'google' ? 'Google Sheets' : s.kind === 'calendar' ? 'Appointments in the app' : 'Built from the app’s records');
const sourceIcon = s => icon(s.kind === 'calendar' ? 'calendar' : 'googleSheets');

function renderSources() {
  const list = panel.querySelector('[data-ask-source-list]');
  const count = ticked().length;
  panel.querySelector('[data-ask-source-count]').textContent = sources ? `${count} of ${sources.length}` : '';
  panel.querySelector('[data-ask-scope]').textContent = !sources ? (sourcesError ? 'Sources unavailable' : 'Loading sources')
    : count === sources.length ? `All ${count} sources` : count ? `${count} of ${sources.length} sources` : 'No sources ticked';
  updateSend();

  if (sourcesError) {
    list.innerHTML = `<p class="ask__pop-msg">${escapeHTML(sourcesError)} <button type="button" class="ask__link" data-ask-sources-retry>Try again</button></p>`;
    return;
  }
  if (!sources) {
    list.innerHTML = '<div class="ask-src ask-src--loading"><span class="skeleton"></span></div>'.repeat(4);
    return;
  }
  list.innerHTML = sources.map(s => `
    <label class="ask-src">
      <span class="ask-src__icon ask-src__icon--${s.kind === 'calendar' ? 'calendar' : 'sheet'}">${sourceIcon(s)}</span>
      <span class="ask-src__text">
        <span class="ask-src__name">${escapeHTML(shortTitle(s))}</span>
        <span class="ask-src__meta">${escapeHTML(originLabel(s))}</span>
      </span>
      ${s.url ? `<a class="ask-src__open" href="${escapeHTML(s.url)}" target="_blank" rel="noopener" aria-label="Open ${escapeHTML(s.title)} in Google Sheets">${icon('external')}</a>` : ''}
      <input class="ask-switch" type="checkbox" role="switch" value="${escapeHTML(s.id)}" data-ask-source ${selected.has(s.id) ? 'checked' : ''} ${busy ? 'disabled' : ''}>
    </label>`).join('');
}

/* ---------- Asking ---------- */

function updateSend() {
  const button = panel.querySelector('[data-ask-send]');
  button.classList.toggle('is-stop', busy);
  button.setAttribute('aria-label', busy ? 'Stop' : 'Send');
  button.innerHTML = busy ? '<span class="ask__stop-mark"></span>' : icon('arrowUp');
  button.disabled = !busy && sources !== null && !ticked().length;
}

async function send(raw) {
  const text = String(raw || '').trim();
  if (!text || busy) return;
  if (!selected.size) {
    togglePopover('sources');
    return;
  }
  closePopovers();
  const input = panel.querySelector('[data-ask-input]');
  input.value = '';
  autoGrow(input);
  messages.push({ role: 'user', text, at: Date.now(), fresh: true });
  await ask(messages.length === 1);
}

function retryLast() {
  if (busy) return;
  const last = messages[messages.length - 1];
  if (last && (last.error || last.stopped)) messages.pop();
  ask();
}

/** Ask the last question again, as a new turn (the saved conversation shows both answers too). */
function regenerate() {
  if (busy) return;
  const last = [...messages].reverse().find(m => m.role === 'user');
  if (!last) return;
  messages.push({ role: 'user', text: last.text, at: Date.now(), fresh: true });
  ask();
}

function stop() {
  if (controller) controller.abort();
}

async function ask(first = false) {
  busy = true;
  controller = new AbortController();
  startedAt = Date.now();
  if (first) morph(render); else render();
  renderSources();
  clock = setInterval(updateStatus, 1000);
  // Only the new question travels: the server keeps the conversation and saves this turn to it.
  const question = [...messages].reverse().find(m => m.role === 'user');
  try {
    const res = await apiFetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question ? question.text : '', chatId, sources: [...selected] }),
      signal: controller.signal
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Ayusha could not answer right now. Please try again.');
    messages.push({ role: 'assistant', text: String(body.answer || ''), refs: Array.isArray(body.refs) ? body.refs : [], fresh: true });
    if (body.chatId) chatId = body.chatId;
    chatList = null; // the list changed; refetch when History opens
  } catch (err) {
    if (err.name === 'AbortError') messages.push({ role: 'assistant', text: 'Stopped before an answer came back.', stopped: true, fresh: true });
    else messages.push({ role: 'assistant', text: err.message || 'Ayusha could not answer right now. Please try again.', error: true, fresh: true });
  } finally {
    busy = false;
    controller = null;
    clearInterval(clock);
    render();
    renderSources();
    focusInput();
  }
}

function updateStatus() {
  const el = panel.querySelector('[data-ask-elapsed]');
  if (el) el.textContent = `${Math.round((Date.now() - startedAt) / 1000)}s`;
}

async function copyAnswer(button) {
  const m = messages[Number(button.dataset.askCopy)];
  if (!m) return;
  try {
    await navigator.clipboard.writeText(m.text);
    button.classList.add('is-done');
    button.querySelector('span').textContent = 'Copied';
    setTimeout(() => { button.classList.remove('is-done'); button.querySelector('span').textContent = 'Copy'; }, 1600);
  } catch { /* clipboard blocked: nothing to do */ }
}

/* ---------- History (stored on the server, 90 days, owner only) ---------- */

function newChat() {
  if (busy) return;
  closePopovers();
  const had = messages.length > 0;
  messages = [];
  chatId = null;
  if (had) morph(render); else render();
  focusInput();
}

async function openConversation(id) {
  if (busy) return;
  closePopovers();
  try {
    const res = await apiFetch(`/api/assistant/chats/${encodeURIComponent(id)}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'That conversation could not be opened.');
    const wasEmpty = !messages.length;
    messages = Array.isArray(body.messages) ? body.messages : [];
    chatId = body.id;
    if (wasEmpty) morph(render); else render();
  } catch (err) {
    chatList = null;
    historyError = err.message;
    togglePopover('history');
  }
}

async function deleteConversation(id) {
  if (busy) return;
  try {
    const res = await apiFetch(`/api/assistant/chats/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error('That conversation could not be deleted. Please try again.');
    if (chatList) chatList = chatList.filter(c => c.id !== id);
    if (chatId === id) { messages = []; chatId = null; render(); }
    historyError = '';
  } catch (err) {
    historyError = err.message;
  }
  renderHistory();
}

async function loadHistory() {
  historyError = '';
  if (chatList) return renderHistory();
  renderHistory(true);
  try {
    const res = await apiFetch('/api/assistant/chats');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Your conversations could not be loaded.');
    chatList = Array.isArray(body.chats) ? body.chats : [];
  } catch (err) {
    historyError = err.message;
  }
  renderHistory();
}

function renderHistory(loading = false) {
  const list = panel.querySelector('[data-ask-history]');
  if (loading) {
    list.innerHTML = '<div class="ask-hist ask-hist--loading"><span class="skeleton"></span></div>'.repeat(3);
    return;
  }
  const error = historyError ? `<p class="ask__pop-msg ask__pop-msg--error">${escapeHTML(historyError)}</p>` : '';
  const all = chatList || [];
  list.innerHTML = error + (all.length
    ? all.map(c => `
      <div class="ask-hist${c.id === chatId ? ' is-current' : ''}">
        <button type="button" class="ask-hist__open" data-ask-history-item="${escapeHTML(c.id)}"><span class="ask-hist__title">${escapeHTML(c.title)}</span><span class="ask-hist__meta">${escapeHTML(dayLabel(c.updatedAt))}${c.count > 1 ? ` · ${c.count} questions` : ''}</span></button>
        <button type="button" class="ask-hist__delete" data-ask-history-delete="${escapeHTML(c.id)}" aria-label="Delete this conversation">${icon('trash')}</button>
      </div>`).join('')
    : (error ? '' : '<p class="ask__pop-msg">Your conversations appear here. Only you can see them, and each is deleted 90 days after its last question.</p>'));
}

function dayLabel(at) {
  if (!at) return '';
  try {
    const d = new Date(at);
    const sameDay = d.toDateString() === new Date().toDateString();
    return new Intl.DateTimeFormat('en-IN', sameDay ? { hour: 'numeric', minute: '2-digit' } : { day: 'numeric', month: 'short' }).format(d);
  } catch {
    return '';
  }
}

/* ---------- Rendering ---------- */

function greeting() {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const first = String((getSession() || {}).displayName || '').trim().split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
}

function render() {
  const log = panel.querySelector('[data-ask-log]');
  const cards = panel.querySelector('[data-ask-reports]');
  panel.classList.toggle('ask--empty', !messages.length);
  panel.classList.toggle('ask--busy', busy);
  if (!messages.length) {
    log.innerHTML = `
      <div class="ask-hero">
        <span class="ask-hero__mark" aria-hidden="true">${icon('sparkles')}</span>
        <h3 class="ask-hero__title">${escapeHTML(greeting())}.<span>What would you like to know?</span></h3>
      </div>`;
    cards.innerHTML = reports().map((r, i) => `
      <button type="button" class="ask-card" style="--i:${i}" data-ask-suggest="${escapeHTML(r.prompt)}">
        <span class="ask-card__icon">${icon(r.icon)}</span>
        <span class="ask-card__text"><b>${escapeHTML(r.label)}</b><small>${escapeHTML(r.detail)}</small></span>
        <span class="ask-card__go">${icon('arrowRight')}</span>
      </button>`).join('');
  } else {
    cards.innerHTML = '';
    const lastAnswer = messages.map(m => m.role).lastIndexOf('assistant');
    const unanswered = !busy && messages[messages.length - 1].role === 'user';
    log.innerHTML = `<div class="ask-thread">${messages.map((m, i) => messageHTML(m, i, i === lastAnswer)).join('')}${busy ? statusHTML() : ''}${unanswered ? turnHTML('<div class="ask-notice">This question wasn’t answered. <button type="button" class="ask__link" data-ask-retry>Ask again</button></div>') : ''}</div>`;
    messages.forEach(m => { delete m.fresh; });
    const lastQuestion = [...log.querySelectorAll('.ask-q')].pop();
    // While reading, keep the status in view; once answered, start at the question.
    log.scrollTop = busy || !lastQuestion ? log.scrollHeight : Math.max(0, lastQuestion.offsetTop - 24);
  }
  updateSend();
}

const avatar = (extra = '') => `<span class="ask-avatar${extra}" aria-hidden="true">${icon('sparkles')}</span>`;
const turnHTML = (inner, extra = '') => `<div class="ask-turn${extra}">${avatar()}<div class="ask-turn__body">${inner}</div></div>`;

function statusHTML() {
  const on = ticked();
  return `
    <div class="ask-turn ask-rise" role="status">${avatar(' is-working')}
      <div class="ask-turn__body">
        <p class="ask-status__line"><span class="ask-status__label">Reading ${on.length} source${on.length === 1 ? '' : 's'}</span><span class="ask-status__time" data-ask-elapsed>0s</span></p>
        <div class="ask-status__chips">${on.map((s, i) => `<span class="ask-status__chip" style="--i:${i}">${sourceIcon(s)}${escapeHTML(shortTitle(s))}</span>`).join('')}</div>
      </div>
    </div>`;
}

function messageHTML(m, index, isLastAnswer) {
  const rise = m.fresh ? ' ask-rise' : '';
  if (m.role === 'user') return `<div class="ask-q${m.fresh ? ' ask-pop-in' : ''}">${escapeHTML(m.text)}</div>`;
  if (m.error || m.stopped) {
    return turnHTML(`<div class="ask-notice${m.error ? ' ask-notice--error' : ''}">${escapeHTML(m.text)} <button type="button" class="ask__link" data-ask-retry>Ask again</button></div>`, rise);
  }
  const refs = m.refs || [];
  const records = refs.length
    ? `<div class="assistant-records"><span>Records</span>${refs.map(r => `<a class="assistant-record" data-assistant-record href="${recordHref(r.id)}">${escapeHTML(r.name)} <small>${escapeHTML(r.id)}</small></a>`).join('')}</div>`
    : '';
  return turnHTML(`
    ${scaleCharts(m.text, refs).map(c => chartHTML(c, rise)).join('')}
    <div class="assistant-msg assistant-msg--bot">${formatAnswer(m.text, refs)}${records}</div>
    <div class="ask-actions">
      <button type="button" class="ask-action" data-ask-copy="${index}">${icon('clipboard')}<span>Copy</span></button>
      ${isLastAnswer ? `<button type="button" class="ask-action" data-ask-regenerate>${icon('refresh')}<span>Ask again</span></button>` : ''}
    </div>`, rise);
}

function recordHref(id) {
  return `${pagePath('child-profile')}?id=${encodeURIComponent(id)}`;
}

/* ---------- "Before → after" answers as a ranked change list ---------- */

const CHANGE = /(\d+(?:\.\d+)?)\s*(kg|cm)\b[^|→\n]*?(?:→|->)\s*(\d+(?:\.\d+)?)\s*(kg|cm)\b/gi;
const UNITS = { kg: 'Weight', cm: 'Height' };

/**
 * Finds lines of the answer that give one person two readings in the same unit
 * ("Rohan Das (CH-D103) | 26.6 kg → 27.2 kg") and returns one list per unit when
 * at least two people have them, biggest change first. Nothing is invented:
 * every number shown is one the answer already states.
 */
function scaleCharts(text, refs) {
  if (!refs.length) return [];
  const byName = [...refs].sort((a, b) => b.name.length - a.name.length);
  const found = { kg: new Map(), cm: new Map() };
  String(text).split('\n').forEach(line => {
    const ref = byName.find(r => line.includes(r.id) || line.includes(r.name));
    if (!ref) return;
    for (const m of line.matchAll(CHANGE)) {
      const unit = m[2].toLowerCase();
      if (unit !== m[4].toLowerCase() || found[unit].has(ref.id)) continue;
      const from = Number(m[1]), to = Number(m[3]);
      found[unit].set(ref.id, { id: ref.id, name: ref.name, from, to, d: Number((to - from).toFixed(1)) });
    }
  });
  return Object.keys(found).filter(unit => found[unit].size >= 2).map(unit => {
    const rows = [...found[unit].values()].sort((a, b) => b.d - a.d || a.name.localeCompare(b.name)).slice(0, 30);
    return { unit, rows, max: Math.max(...rows.map(r => Math.abs(r.d)), 0.1) };
  });
}

function chartHTML({ unit, rows, max }, rise) {
  const fmt = d => (d === 0 ? 'No change' : `${d > 0 ? '+' : '−'}${Math.abs(d)} ${unit}`);
  const up = rows.filter(r => r.d > 0).length;
  const down = rows.filter(r => r.d < 0).length;
  const same = rows.length - up - down;
  const summary = [up && `${up} gained`, down && `${down} lost`, same && `${same} unchanged`].filter(Boolean).join(' · ');
  const top = rows[0];
  return `
    <figure class="ask-chart${rise}" aria-label="${UNITS[unit]} change for ${rows.length} people">
      <figcaption class="ask-chart__head">
        <b>${UNITS[unit]} change</b>
        <span>${summary}${top.d > 0 ? ` · largest gain ${fmt(top.d)}` : ''}</span>
      </figcaption>
      ${rows.map((r, i) => `
        <div class="ask-chart__row" style="--i:${Math.min(i, 10)}">
          <a class="ask-chart__name" data-assistant-record href="${recordHref(r.id)}">${escapeHTML(r.name)}</a>
          <span class="ask-chart__vals">${r.from} → <b>${r.to}</b> ${unit}</span>
          <span class="ask-chart__bar" aria-hidden="true"><i class="${r.d > 0 ? 'is-up' : r.d < 0 ? 'is-down' : ''}" style="width:${Math.max(4, Math.round(Math.abs(r.d) / max * 100))}%"></i></span>
          <span class="ask-chart__delta${r.d > 0 ? ' is-up' : r.d < 0 ? ' is-down' : ''}">${fmt(r.d)}</span>
        </div>`).join('')}
    </figure>`;
}

/**
 * Escapes the answer, links the people the server confirmed (refs), and applies
 * a small subset of formatting: **bold**, "- " / "* " / "1. " list lines, and
 * simple "a | b | c" tables.
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
  let list = false;
  let table = null;
  const flushTable = () => {
    if (!table) return;
    const [head, ...body] = table;
    html += `<div class="ask-table"><table><thead><tr>${head.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    table = null;
  };
  for (const line of lines) {
    if (/^\s*\|.*\|\s*$/.test(line)) {
      if (list) { html += '</ul>'; list = false; }
      if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue; // the |---|---| divider
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      (table = table || []).push(cells);
      continue;
    }
    flushTable();
    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (bullet) {
      if (!list) { html += '<ul>'; list = true; }
      html += `<li>${bullet[1]}</li>`;
      continue;
    }
    if (list) { html += '</ul>'; list = false; }
    if (line.trim()) html += `<p>${line}</p>`;
  }
  flushTable();
  if (list) html += '</ul>';

  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => links[Number(i)]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
