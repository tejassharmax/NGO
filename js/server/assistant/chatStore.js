/**
 * assistant/chatStore.js
 * Ask Ayusha conversations, stored in Firestore so nothing is kept in the
 * browser. Each conversation lives under its space at
 * `ngos/{space}/assistantChats/{chatId}` and belongs to the staff member who
 * asked it: only that person can list, open or delete it.
 *
 * Retention: a conversation is deleted 90 days after its last question. Every
 * document carries `expiresAt` (a Firestore TTL policy on that field removes it
 * automatically once one is set up in the Google Cloud console), and expired
 * conversations are also deleted here whenever their owner lists their chats.
 *
 * Only the server touches this collection (Firestore rules deny all client
 * access), and the space loader reads a fixed list of collections, so chats are
 * never sent to the browser with the space's records.
 */

const crypto = require('crypto');
const { getDb } = require('../firebaseAdmin');
const { sanitizeNgoSlug } = require('../ngoStore');

const RETENTION_DAYS = 90;
const MAX_MESSAGES = 40; // 20 questions and their answers
const MAX_TEXT = 20000;
const MAX_REFS = 60;
const LIST_LIMIT = 30;

class ChatNotFound extends Error {}

function collectionFor(slug) {
  const db = getDb();
  if (!db) return null;
  return db.collection('ngos').doc(sanitizeNgoSlug(slug)).collection('assistantChats');
}

const ownerKey = email => String(email || '').trim().toLowerCase();
const expiry = from => new Date(from.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);

function cleanRefs(refs) {
  return (Array.isArray(refs) ? refs : [])
    .filter(r => r && typeof r.id === 'string' && typeof r.name === 'string')
    .slice(0, MAX_REFS)
    .map(r => ({ id: r.id.slice(0, 64), name: r.name.slice(0, 120) }));
}

function cleanMessage(m) {
  const out = { role: m.role === 'assistant' ? 'assistant' : 'user', text: String(m.text || '').slice(0, MAX_TEXT), at: Number(m.at) || Date.now() };
  if (out.role === 'assistant') out.refs = cleanRefs(m.refs);
  return out;
}

/** Whether chats can be stored (Firestore is configured). */
function isAvailable() {
  return !!getDb();
}

/**
 * The owner's conversations, newest first, without their messages. Expired
 * conversations are deleted on the way.
 */
async function listChats(slug, email) {
  const col = collectionFor(slug);
  if (!col) return [];
  const snap = await col.where('owner', '==', ownerKey(email)).get();
  const now = Date.now();
  const live = [];
  const expired = [];
  snap.forEach(doc => {
    const d = doc.data() || {};
    const exp = d.expiresAt && d.expiresAt.toDate ? d.expiresAt.toDate().getTime() : 0;
    if (exp && exp <= now) expired.push(doc.ref);
    else live.push({ id: doc.id, title: d.title || 'Conversation', updatedAt: d.updatedAt && d.updatedAt.toDate ? d.updatedAt.toDate().getTime() : 0, count: Number(d.questions) || 0 });
  });
  if (expired.length) await Promise.all(expired.map(ref => ref.delete().catch(() => {})));
  return live.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, LIST_LIMIT);
}

async function ownedDoc(slug, email, chatId) {
  const col = collectionFor(slug);
  if (!col || typeof chatId !== 'string' || !/^[a-f0-9]{24}$/.test(chatId)) throw new ChatNotFound('Conversation not found');
  const ref = col.doc(chatId);
  const snap = await ref.get();
  const d = snap.exists ? snap.data() : null;
  const exp = d && d.expiresAt && d.expiresAt.toDate ? d.expiresAt.toDate().getTime() : 0;
  if (!d || d.owner !== ownerKey(email) || (exp && exp <= Date.now())) throw new ChatNotFound('Conversation not found');
  return { ref, data: d };
}

/** One of the owner's conversations, with its messages. */
async function getChat(slug, email, chatId) {
  const { data } = await ownedDoc(slug, email, chatId);
  return { id: chatId, title: data.title || 'Conversation', messages: Array.isArray(data.messages) ? data.messages : [] };
}

/**
 * Adds a question and its answer to the owner's conversation, creating it when
 * chatId is empty or unknown to this owner. Returns the conversation id.
 */
async function appendTurn(slug, email, chatId, question, answer) {
  const col = collectionFor(slug);
  if (!col) return null;
  const now = new Date();
  const turn = [cleanMessage({ role: 'user', text: question.text, at: question.at }), cleanMessage({ role: 'assistant', text: answer.text, refs: answer.refs, at: now.getTime() })];
  let existing = null;
  if (chatId) {
    try { existing = await ownedDoc(slug, email, chatId); } catch (err) { if (!(err instanceof ChatNotFound)) throw err; }
  }
  if (existing) {
    const messages = [...(Array.isArray(existing.data.messages) ? existing.data.messages : []), ...turn].slice(-MAX_MESSAGES);
    await existing.ref.update({ messages, questions: (Number(existing.data.questions) || 0) + 1, updatedAt: now, expiresAt: expiry(now) });
    return existing.ref.id;
  }
  const id = crypto.randomBytes(12).toString('hex');
  await col.doc(id).set({
    owner: ownerKey(email),
    title: turn[0].text.replace(/\s+/g, ' ').trim().slice(0, 90) || 'Conversation',
    messages: turn,
    questions: 1,
    createdAt: now,
    updatedAt: now,
    expiresAt: expiry(now)
  });
  return id;
}

/** Deletes one of the owner's conversations. */
async function deleteChat(slug, email, chatId) {
  const { ref } = await ownedDoc(slug, email, chatId);
  await ref.delete();
}

/**
 * Deletes every conversation, in every space, whose expiresAt has passed (90 days
 * after its last question). Touches nothing but the assistantChats collections.
 * Free replacement for a Firestore TTL policy, which needs billing enabled.
 * @returns {Promise<number>} how many conversations were deleted
 */
async function purgeExpired() {
  const db = getDb();
  if (!db) return 0;
  const now = new Date();
  let deleted = 0;
  const spaces = await db.collection('ngos').listDocuments();
  for (const space of spaces) {
    const snap = await space.collection('assistantChats').where('expiresAt', '<=', now).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch();
      snap.docs.slice(i, i + 400).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    deleted += snap.size;
  }
  return deleted;
}

/** Runs purgeExpired a minute after start-up and then every 24 hours. */
function scheduleDailyPurge() {
  const run = () => purgeExpired()
    .then(n => { if (n) console.log(`[assistant] Deleted ${n} conversation(s) older than ${RETENTION_DAYS} days`); })
    .catch(err => console.warn('[assistant] Clean-up of old conversations failed:', err.message));
  setTimeout(run, 60 * 1000).unref();
  setInterval(run, 24 * 60 * 60 * 1000).unref();
}

module.exports = { isAvailable, listChats, getChat, appendTurn, deleteChat, purgeExpired, scheduleDailyPurge, ChatNotFound, RETENTION_DAYS };
