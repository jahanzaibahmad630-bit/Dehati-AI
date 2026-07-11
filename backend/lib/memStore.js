/**
 * Shared in-memory store — persists across route files within the same process.
 * Data is LOST on server restart. Acts as a fallback when Supabase is unavailable.
 */

// phone → user object
const memUsers = new Map();

// Recent registration events for the admin activity feed (last 100)
const recentRegistrations = [];
const MAX_RECENT = 100;

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

module.exports = { memUsers, addMemUser, getMemUsers, deleteMemUser, getRecentRegistrations };
