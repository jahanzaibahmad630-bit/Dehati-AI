/**
 * Shared in-memory store — persists across route files within the same process.
 * Data is LOST on server restart. Acts as a fallback when Supabase is unavailable.
 */

// phone → user object
const memUsers = new Map();

// Recent registration events for the admin activity feed (last 100)
const recentRegistrations = [];
const MAX_RECENT = 100;

// In-memory chat log fallback (last 200 questions when no DB is connected)
const memChatLogs = [];
const MAX_CHAT_LOGS = 200;

function addMemUser(user) {
  memUsers.set(user.phone, user);
  recentRegistrations.unshift({
    id: user.id,
    name: user.name,
    phone: user.phone,
    district: user.district || '—',
    land_size: user.land_size,
    created_at: user.created_at || new Date().toISOString(),
    is_guest: user.is_guest || false,
    source: 'memory'  // so admin can see it came from memory fallback
  });
  if (recentRegistrations.length > MAX_RECENT) recentRegistrations.pop();
}

function getMemUsers() {
  return Array.from(memUsers.values());
}

function deleteMemUser(phone) {
  memUsers.delete(phone);
}

function getRecentRegistrations(limit = 20) {
  return recentRegistrations.slice(0, limit);
}

function addMemChatLog({ userId, userName, userPhone, question, answer, language }) {
  memChatLogs.unshift({
    id: Date.now(),
    user_id: userId || null,
    user_name: userName || null,
    user_phone: userPhone || null,
    question,
    answer: answer || null,
    language: language || 'ur',
    created_at: new Date().toISOString()
  });
  if (memChatLogs.length > MAX_CHAT_LOGS) memChatLogs.pop();
}

function getMemChatLogs({ page = 1, limit = 30, search = '' } = {}) {
  let results = memChatLogs;
  if (search) {
    const s = search.toLowerCase();
    results = memChatLogs.filter(l =>
      (l.question && l.question.toLowerCase().includes(s)) ||
      (l.user_name && l.user_name.toLowerCase().includes(s))
    );
  }
  const total = results.length;
  const offset = (page - 1) * limit;
  return { logs: results.slice(offset, offset + limit), total };
}

module.exports = {
  memUsers, addMemUser, getMemUsers, deleteMemUser, getRecentRegistrations,
  memChatLogs, addMemChatLog, getMemChatLogs
};
