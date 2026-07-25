// AdminPanel v2.1 — with Announcements tab
import { useState, useEffect, useCallback } from 'react';

import { API_URL as API } from '../../config';

async function adminFetch(path, options = {}) {
  const token = sessionStorage.getItem('dehati_admin_token');
  const res = await fetch(`${API}/api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  // Auto-logout on token expiry (H3 fix)
  if (res.status === 401) {
    sessionStorage.removeItem('dehati_admin_token');
    window.location.reload();
    return res; // unreachable but satisfies async flow
  }
  return res;
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = '#2e5a27' }) {
  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: '1.25rem',
      boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid #f0f0f0',
      display: 'flex', flexDirection: 'column', gap: '.35rem'
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
      }}>{icon}</div>
      <div style={{ fontSize: '.78rem', fontWeight: 600, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: '.72rem', color: '#9ca3af' }}>{sub}</div>}
    </div>
  );
}

// ── Health Badge ───────────────────────────────────────────────────────────────
function HealthBadge({ status, latency }) {
  const cfg = {
    ok:             { bg: '#dcfce7', color: '#16a34a', label: 'Online' },
    error:          { bg: '#fee2e2', color: '#dc2626', label: 'Error'  },
    not_configured: { bg: '#fef3c7', color: '#d97706', label: 'Not Set'},
  }[status] || { bg: '#f3f4f6', color: '#6b7280', label: 'Unknown' };

  return (
    <span style={{
      background: cfg.bg, color: cfg.color, borderRadius: 20,
      padding: '.2rem .7rem', fontSize: '.75rem', fontWeight: 700, display: 'inline-flex', gap: '.3rem'
    }}>
      {cfg.label}{latency != null ? ` (${latency}ms)` : ''}
    </span>
  );
}

// ── Users Tab ──────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [msg, setMsg]         = useState('');

  const [debouncedSearch, setDebouncedSearch] = useState('');

  // H2 fix: debounce search to prevent a request on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/users?page=${page}&limit=15&search=${encodeURIComponent(debouncedSearch)}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  }, [page, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await adminFetch(`/users/${id}`, { method: 'DELETE' });
      setMsg(`✅ User "${name}" deleted`);
      load();
    } catch { setMsg('❌ Delete failed'); }
    setDeleting(null);
    setTimeout(() => setMsg(''), 3000);
  };

  const exportCSV = () => {
    const csv = [
      ['Name','Phone','District','Land (acres)','Registered','Guest'],
      ...users.map(u => [u.name, u.phone, u.district||'', u.land_size||'', u.created_at?.split('T')[0]||'', u.is_guest?'Yes':'No'])
    ].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'dehati_users.csv'; a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="🔍 Search name or phone..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 200, padding: '.6rem 1rem', borderRadius: 10, border: '2px solid #e5e7eb', fontSize: '.875rem', fontFamily: 'Inter, sans-serif' }}
        />
        <span style={{ color: '#6b7280', fontSize: '.875rem', whiteSpace: 'nowrap' }}>{total} users</span>
        <button onClick={exportCSV} style={btnStyle('#2e5a27')}>⬇ Export CSV</button>
      </div>

      {msg && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '.6rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '.875rem', fontWeight: 600 }}>{msg}</div>}

      {loading ? <Spinner /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Name','Phone','District','Land','Joined','Type','Action'].map(h => (
                  <th key={h} style={{ padding: '.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ background: i % 2 ? '#fafafa' : 'white', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#fafafa' : 'white'}
                >
                  <td style={tdStyle}><strong>{u.name}</strong></td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{u.phone}</td>
                  <td style={tdStyle}>{u.district || '—'}</td>
                  <td style={tdStyle}>{u.land_size ? `${u.land_size} acres` : '—'}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#6b7280' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ background: u.is_guest ? '#fef3c7' : '#dcfce7', color: u.is_guest ? '#d97706' : '#16a34a', padding: '.15rem .5rem', borderRadius: 20, fontSize: '.72rem', fontWeight: 700 }}>
                      {u.is_guest ? 'Guest' : 'Registered'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleDelete(u.id, u.name)}
                      disabled={deleting === u.id}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '.35rem .7rem', cursor: 'pointer', fontSize: '.78rem', fontWeight: 700 }}
                    >
                      {deleting === u.id ? '...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem', justifyContent: 'center' }}>
        <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} style={btnStyle('#6b7280', page === 1)}>← Prev</button>
        <span style={{ padding: '.5rem 1rem', fontSize: '.875rem', color: '#374151' }}>Page {page}</span>
        <button onClick={() => setPage(p => p+1)} disabled={users.length < 15} style={btnStyle('#6b7280', users.length < 15)}>Next →</button>
      </div>
    </div>
  );
}

// ── Prices Tab ───────────────────────────────────────────────────────────────
function PricesTab() {
  const [prices, setPrices]     = useState({});
  const [editing, setEditing]   = useState({});
  const [sourceNotes, setNotes] = useState({});
  const [saving, setSaving]     = useState('');
  const [msg, setMsg]           = useState('');
  const [realCount, setRealCount] = useState(0);

  const load = () => {
    adminFetch('/prices').then(r => r.json()).then(d => {
      setPrices(d.prices || {});
      setRealCount(d.realCount || 0);
      const initEdit = {}, initNotes = {};
      Object.entries(d.prices || {}).forEach(([k, v]) => {
        initEdit[k]  = v.dbPrice ?? v.base;   // show current real price if set, else base
        initNotes[k] = v.sourceNote || 'admin-entry';
      });
      setEditing(initEdit);
      setNotes(initNotes);
    }).catch(() => setMsg('❌ Failed to load prices'));
  };

  useEffect(() => { load(); }, []);

  const save = async (crop) => {
    setSaving(crop);
    try {
      const body = {
        crop,
        price: Number(editing[crop]),
        sourceNote: sourceNotes[crop] || 'admin-entry'
      };
      const res = await adminFetch('/prices', { method: 'PUT', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMsg(`✅ ${crop} saved to DB — ₨${Number(editing[crop]).toLocaleString()} (${body.sourceNote})`);
      setTimeout(() => { setMsg(''); load(); }, 3000);
    } catch (e) { setMsg(`❌ ${e.message}`); }
    setSaving('');
  };

  const revert = async (crop) => {
    if (!confirm(`Revert “${crop}” to sample/reference data?`)) return;
    await adminFetch(`/prices/${encodeURIComponent(crop)}`, { method: 'DELETE' });
    setMsg(`↩️ ${crop} reverted to sample data`);
    setTimeout(() => { setMsg(''); load(); }, 2500);
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
          <div>
            <p style={{ color: '#6b7280', fontSize: '.875rem', margin: 0 }}>
              Enter today’s real mandi prices. Stored in PostgreSQL — <strong>survives restarts</strong>.
            </p>
            <p style={{ color: '#6b7280', fontSize: '.75rem', margin: '2px 0 0' }}>
              Prices without a real entry show as “Sample data” to farmers.
            </p>
          </div>
          <span style={{
            background: realCount > 0 ? '#f0fdf4' : '#fffbeb',
            color: realCount > 0 ? '#16a34a' : '#92400e',
            border: `1px solid ${realCount > 0 ? '#bbf7d0' : '#fde68a'}`,
            borderRadius: 20, padding: '4px 12px', fontSize: '.8rem', fontWeight: 700
          }}>
            {realCount > 0 ? `✅ ${realCount} real` : '📊 all sample'}
          </span>
        </div>
      </div>

      {msg && <div style={{ background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: msg.startsWith('✅') ? '#16a34a' : '#dc2626', padding: '.6rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '.875rem', fontWeight: 600 }}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '.75rem' }}>
        {Object.entries(prices).map(([crop, data]) => (
          <div key={crop} style={{
            background: 'white', borderRadius: 12, padding: '1rem',
            border: `2px solid ${data.isReal ? '#bbf7d0' : '#e5e7eb'}`,
            boxShadow: '0 1px 6px rgba(0,0,0,.05)'
          }}>
            {/* Crop name + status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{crop}</div>
              <span style={{
                fontSize: '.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: data.isReal ? '#dcfce7' : '#fef9c3',
                color: data.isReal ? '#15803d' : '#854d0e'
              }}>
                {data.isReal ? '✅ Real (DB)' : '📊 Sample'}
              </span>
            </div>

            {/* Reference + current DB price */}
            <div style={{ fontSize: '.72rem', color: '#6b7280', marginBottom: '.4rem', fontFamily: 'Inter' }}>
              Reference: ₨{data.base?.toLocaleString()}
              {data.isReal && <span style={{ color: '#16a34a', marginLeft: 8 }}>DB: ₨{data.dbPrice?.toLocaleString()}</span>}
              {data.updatedAt && <span style={{ color: '#9ca3af', marginLeft: 6 }}>· {new Date(data.updatedAt).toLocaleDateString()}</span>}
            </div>

            {/* Price input */}
            <input
              type="number"
              value={editing[crop] || ''}
              onChange={e => setEditing(prev => ({ ...prev, [crop]: e.target.value }))}
              placeholder="Enter today's real price (PKR)"
              style={{ width: '100%', padding: '.5rem .75rem', borderRadius: 8, border: '2px solid #e5e7eb', fontSize: '.875rem', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', marginBottom: '.4rem' }}
            />

            {/* Source note input */}
            <input
              type="text"
              value={sourceNotes[crop] || ''}
              onChange={e => setNotes(prev => ({ ...prev, [crop]: e.target.value }))}
              placeholder="Source (e.g. Lahore mandi, TCP, self-verified)"
              style={{ width: '100%', padding: '.4rem .75rem', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '.75rem', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', color: '#6b7280', marginBottom: '.5rem' }}
            />

            {/* Actions */}
            <div style={{ display: 'flex', gap: '.4rem' }}>
              <button
                onClick={() => save(crop)}
                disabled={saving === crop}
                style={btnStyle('#2e5a27', saving === crop)}
              >
                {saving === crop ? '...' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Announcements Tab ─────────────────────────────────────────────────────────
function AnnouncementsTab() {
  const [list, setList]         = useState([]);
  const [title, setTitle]       = useState('');
  const [message, setMessage]   = useState('');
  const [type, setType]         = useState('info');
  const [expiresAt, setExpires] = useState('');
  const [link, setLink]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');

  const load = async () => {
    try {
      const res = await adminFetch('/announcements');
      const data = await res.json();
      setList(data.announcements || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSaving(true);
    try {
      await adminFetch('/announcements', {
        method: 'POST',
        body: JSON.stringify({ title, message, type, expiresAt: expiresAt || null, link })
      });
      setTitle(''); setMessage(''); setType('info'); setExpires(''); setLink('');
      flash('✅ Announcement published!');
      load();
    } catch { flash('❌ Failed to publish'); }
    setSaving(false);
  };

  const handleToggle = async (id) => {
    try {
      await adminFetch(`/announcements/${id}/toggle`, { method: 'PATCH' });
      load();
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await adminFetch(`/announcements/${id}`, { method: 'DELETE' });
      flash('✅ Deleted');
      load();
    } catch { flash('❌ Delete failed'); }
  };

  const TYPE_OPTIONS = [
    { value: 'info',    label: 'ℹ️ Info (Blue)',    color: '#1d4ed8' },
    { value: 'success', label: '✅ Success (Green)', color: '#15803d' },
    { value: 'warning', label: '⚠️ Warning (Gold)', color: '#b45309' },
    { value: 'urgent',  label: '🔴 Urgent (Red)',   color: '#dc2626' },
  ];

  const TYPE_BADGE = { info: '#dbeafe', success: '#dcfce7', warning: '#fef3c7', urgent: '#fee2e2' };
  const TYPE_COLOR = { info: '#1d4ed8', success: '#15803d', warning: '#b45309', urgent: '#dc2626' };

  return (
    <div>
      {msg && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '.6rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '.875rem', fontWeight: 600 }}>{msg}</div>}

      {/* Create form */}
      <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,.05)', marginBottom: '1.5rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', marginBottom: '1rem' }}>📢 New Announcement</h3>
        <form onSubmit={handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '.75rem' }}>
            <div>
              <label style={labelStyle}>Title (Optional)</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. DAP Price Update" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '.75rem' }}>
            <label style={labelStyle}>Message (Urdu or English) *</label>
            <textarea
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder="گندم کی قیمت آج ₨3,950 ہو گئی — منڈی میں بیچنے کا اچھا وقت ہے۔"
              required rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', direction: 'rtl' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Expires At (Optional)</label>
              <input type="datetime-local" value={expiresAt} onChange={e => setExpires(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Link URL (Optional)</label>
              <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." style={inputStyle} />
            </div>
          </div>

          <button type="submit" disabled={saving || !message.trim()} style={btnStyle('#2e5a27', saving || !message.trim())}>
            {saving ? 'Publishing...' : '📢 Publish Announcement'}
          </button>
        </form>
      </div>

      {/* List */}
      <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', marginBottom: '.75rem' }}>
        All Announcements ({list.length})
      </h3>

      {list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', background: 'white', borderRadius: 16, border: '1px solid #f0f0f0' }}>
          📢 No announcements yet. Create one above.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        {list.map(ann => (
          <div key={ann.id} style={{
            background: 'white', borderRadius: 14, padding: '1rem 1.1rem',
            border: `1.5px solid ${ann.active ? '#86efac' : '#e5e7eb'}`,
            boxShadow: '0 1px 6px rgba(0,0,0,.05)',
            opacity: ann.active ? 1 : .6
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem', flexWrap: 'wrap' }}>
                  <span style={{ background: TYPE_BADGE[ann.type], color: TYPE_COLOR[ann.type], borderRadius: 20, padding: '.15rem .6rem', fontSize: '.72rem', fontWeight: 700 }}>
                    {ann.type.toUpperCase()}
                  </span>
                  {ann.title && <span style={{ fontWeight: 700, fontSize: '.9rem', color: '#111827' }}>{ann.title}</span>}
                  <span style={{ background: ann.active ? '#dcfce7' : '#f3f4f6', color: ann.active ? '#16a34a' : '#9ca3af', borderRadius: 20, padding: '.1rem .5rem', fontSize: '.68rem', fontWeight: 700 }}>
                    {ann.active ? '● Live' : '○ Hidden'}
                  </span>
                </div>
                <div style={{ fontSize: '.875rem', color: '#374151', direction: 'rtl', lineHeight: 1.5 }}>{ann.message}</div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '.4rem', fontSize: '.72rem', color: '#9ca3af', fontFamily: 'monospace', flexWrap: 'wrap' }}>
                  <span>Created: {new Date(ann.createdAt).toLocaleString()}</span>
                  {ann.expiresAt && <span>Expires: {new Date(ann.expiresAt).toLocaleString()}</span>}
                  {ann.link && <span>Link: {ann.link}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
                <button onClick={() => handleToggle(ann.id)} style={{ ...btnStyle(ann.active ? '#6b7280' : '#16a34a'), padding: '.35rem .7rem', fontSize: '.75rem' }}>
                  {ann.active ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => handleDelete(ann.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '.35rem .7rem', cursor: 'pointer', fontSize: '.75rem', fontWeight: 700 }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '.78rem', fontWeight: 700, color: '#374151', marginBottom: '.3rem' };
const inputStyle = { width: '100%', padding: '.6rem .875rem', borderRadius: 8, border: '2px solid #e5e7eb', fontSize: '.875rem', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', outline: 'none' };

// -- Schemes Tab --
function SchemesTab() {
  const [schemes, setSchemes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');

  const load = async () => {
    try {
      const res  = await adminFetch('/schemes');
      const data = await res.json();
      setSchemes(data.schemes || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const openNew = () => {
    setForm({ name: '', icon: '📋', tagline: '', amount: '', amountDetail: '', subsidy: '',
      eligibility: '', documents: '', howToApply: '', applyPhone: '', applyUrl: '',
      source: '', lastVerified: new Date().toISOString().split('T')[0] });
    setEditing('new');
  };

  const openEdit = (s) => {
    setForm({ ...s, documents: Array.isArray(s.documents) ? s.documents.join('\n') : (s.documents || '') });
    setEditing(s);
  };

  const closeForm = () => { setEditing(null); setForm({}); };

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      if (editing === 'new') {
        await adminFetch('/schemes', { method: 'POST', body: JSON.stringify(form) });
        flash('Scheme added!');
      } else {
        await adminFetch(`/schemes/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
        flash('Scheme updated!');
      }
      closeForm(); load();
    } catch { flash('Save failed'); }
    setSaving(false);
  };

  const handleToggle = async (id) => { await adminFetch(`/schemes/${id}/toggle`, { method: 'PATCH' }); load(); };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await adminFetch(`/schemes/${id}`, { method: 'DELETE' });
    flash('Deleted'); load();
  };

  const Field = ({ field, label, placeholder, type = 'text', rtl = false }) => (
    <div style={{ marginBottom: '.6rem' }}>
      <label style={labelStyle}>{label}</label>
      {type === 'textarea'
        ? <textarea value={form[field] || ''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
            placeholder={placeholder} rows={3}
            style={{ ...inputStyle, resize: 'vertical', direction: rtl ? 'rtl' : 'ltr', fontFamily: 'inherit' }} />
        : <input type={type} value={form[field] || ''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
            placeholder={placeholder} style={inputStyle} />}
    </div>
  );

  return (
    <div>
      {msg && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '.6rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '.875rem', fontWeight: 600 }}>{msg}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ color: '#6b7280', fontSize: '.875rem' }}>{schemes.length} schemes total — edit, hide, or add new</p>
        <button onClick={openNew} style={btnStyle('#2e5a27')}>+ Add New Scheme</button>
      </div>

      {editing && (
        <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', border: '1.5px solid #86efac', marginBottom: '1.5rem', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '1rem' }}>
              {editing === 'new' ? '+ New Scheme' : `Edit: ${editing.name}`}
            </h3>
            <button onClick={closeForm} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '.4rem .75rem', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 }}>Cancel</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <Field field="name" label="Scheme Name *" placeholder="CM Punjab Kisan Card" />
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <div style={{ flex: '0 0 60px' }}><Field field="icon" label="Icon" placeholder="📋" /></div>
              <div style={{ flex: 1 }}><Field field="tagline" label="Tagline (Urdu)" placeholder="سود کے بغیر قرضہ" /></div>
            </div>
            <Field field="amount" label="Amount" placeholder="₨1 لاکھ سے ₨2 لاکھ" />
            <Field field="subsidy" label="Subsidy" placeholder="کھاد سبسڈی" />
          </div>
          <Field field="amountDetail" label="Amount Detail (Urdu)" placeholder="تفصیلات..." type="textarea" rtl />
          <Field field="eligibility" label="Eligibility اہلیت (Urdu)" placeholder="پنجاب میں زمین ہو..." type="textarea" rtl />
          <Field field="documents" label="Documents (one per line, Urdu)" placeholder="CNIC&#10;زمین کی فرد&#10;بینک اکاؤنٹ" type="textarea" rtl />
          <Field field="howToApply" label="How to Apply (Urdu)" placeholder="درخواست کا طریقہ..." type="textarea" rtl />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <Field field="applyPhone" label="Phone" placeholder="0800-15000" />
            <Field field="applyUrl" label="Website URL" placeholder="https://" />
            <Field field="source" label="Source" placeholder="Punjab Government" />
            <Field field="lastVerified" label="Last Verified" type="date" />
          </div>
          <button onClick={handleSave} disabled={saving || !form.name?.trim()} style={{ ...btnStyle('#2e5a27', saving || !form.name?.trim()), marginTop: '.5rem' }}>
            {saving ? 'Saving...' : 'Save Scheme'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        {schemes.map(s => (
          <div key={s.id} style={{ background: 'white', borderRadius: 14, padding: '1rem 1.1rem',
            border: `1.5px solid ${s.active !== false ? '#86efac' : '#e5e7eb'}`,
            opacity: s.active !== false ? 1 : .6, boxShadow: '0 1px 6px rgba(0,0,0,.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
              <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>{s.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '.9rem', color: '#111827' }}>{s.name}</span>
                  <span style={{ background: s.active !== false ? '#dcfce7' : '#f3f4f6', color: s.active !== false ? '#16a34a' : '#9ca3af', borderRadius: 20, padding: '.1rem .5rem', fontSize: '.68rem', fontWeight: 700 }}>
                    {s.active !== false ? 'Live' : 'Hidden'}
                  </span>
                </div>
                <div style={{ fontSize: '.78rem', color: '#6b7280', direction: 'rtl' }}>{s.tagline} — {s.amount}</div>
              </div>
              <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
                <button onClick={() => openEdit(s)} style={{ ...btnStyle('#2563eb'), padding: '.3rem .65rem', fontSize: '.75rem' }}>Edit</button>
                <button onClick={() => handleToggle(s.id)} style={{ ...btnStyle(s.active !== false ? '#6b7280' : '#16a34a'), padding: '.3rem .65rem', fontSize: '.75rem' }}>
                  {s.active !== false ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => handleDelete(s.id, s.name)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '.3rem .65rem', cursor: 'pointer', fontSize: '.75rem', fontWeight: 700 }}>Del</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthTab() {

  const [health, setHealth]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbTest, setDbTest]   = useState(null);
  const [dbTesting, setDbTesting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/health');
      const data = await res.json();
      setHealth(data);
    } catch {}
    setLoading(false);
  };

  const runDbTest = async () => {
    setDbTesting(true);
    setDbTest(null);
    try {
      const res = await adminFetch('/db-test');
      const data = await res.json();
      setDbTest(data);
    } catch (e) {
      setDbTest({ error: e.message });
    }
    setDbTesting(false);
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  if (loading) return <Spinner />;

  const services = [
    { name: 'Backend (Railway)',  key: 'backend', icon: '⚡' },
    { name: 'Claude AI',          key: 'claude',  icon: '🤖' },
    { name: 'Open-Meteo Weather', key: 'openMeteo', icon: '🌤️' },
    { name: 'Supabase Database',  key: 'supabase',  icon: '🗄️' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <p style={{ color: '#6b7280', fontSize: '.875rem' }}>Auto-refreshes every 30 seconds</p>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button onClick={runDbTest} disabled={dbTesting} style={btnStyle('#7c3aed')}>
            {dbTesting ? '⏳ Testing...' : '🗄️ Test DB Write'}
          </button>
          <button onClick={load} style={btnStyle('#2e5a27')}>🔄 Refresh Now</button>
        </div>
      </div>

      {/* DB Test Result */}
      {dbTest && (
        <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 16, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#111827', marginBottom: '.75rem' }}>🗄️ Database Write Test Results</div>
          {['postgres', 'supabase'].map(key => (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '.75rem', padding: '.6rem 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ minWidth: 90, fontWeight: 700, fontSize: '.8rem', color: '#374151', textTransform: 'capitalize' }}>{key}</span>
              {dbTest[key] ? (
                dbTest[key].ok
                  ? <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '.8rem' }}>✅ Working — {dbTest[key].userCount} users in DB</span>
                  : <span style={{ color: '#dc2626', fontSize: '.78rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>❌ {dbTest[key].error}</span>
              ) : <span style={{ color: '#9ca3af', fontSize: '.8rem' }}>Not configured</span>}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
        {services.map(s => {
          const data = health?.checks?.[s.key] || {};
          return (
            <div key={s.key} style={{ background: 'white', borderRadius: 16, padding: '1.25rem', border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '1.5rem', marginBottom: '.3rem' }}>{s.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#111827' }}>{s.name}</div>
                </div>
                <HealthBadge status={data.status} latency={data.latency} />
              </div>
              {data.error && (
                <div style={{ marginTop: '.5rem', fontSize: '.72rem', color: '#dc2626', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {data.error}
                </div>
              )}
              {data.hint && (
                <div style={{ marginTop: '.4rem', fontSize: '.72rem', color: '#d97706', fontWeight: 600, lineHeight: 1.4 }}>
                  💡 {data.hint}
                </div>
              )}

            </div>
          );
        })}
      </div>
      {health?.timestamp && (
        <p style={{ textAlign: 'center', marginTop: '1.25rem', color: '#9ca3af', fontSize: '.75rem' }}>
          Last checked: {new Date(health.timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

// ── Recent Tab ─────────────────────────────────────────────────────────────────
function RecentTab() {
  const [recent, setRecent]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = async () => {
    try {
      const r = await adminFetch('/recent');
      const d = await r.json();
      setRecent(d.recent || []);
      setLastUpdated(new Date());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // auto-refresh every 30s
    return () => clearInterval(t);
  }, []);

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
      {/* Header with refresh button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
        <span style={{ fontSize: '.78rem', color: '#9ca3af' }}>
          {lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()} • auto-refreshes every 30s` : 'Loading...'}
        </span>
        <button onClick={load} style={btnStyle('#2e5a27')}>🔄 Refresh</button>
      </div>

      {recent.length === 0 && (
        <div style={{ background: '#f9fafb', border: '1.5px dashed #d1d5db', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>👤</div>
          <div style={{ color: '#6b7280', fontWeight: 600, marginBottom: '.3rem' }}>No registrations yet</div>
          <div style={{ color: '#9ca3af', fontSize: '.8rem' }}>Ask a farmer to register at <strong>dehati-ai.vercel.app</strong> — they will appear here instantly</div>
        </div>
      )}
      {recent.map(u => (
        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '.875rem', background: 'white', borderRadius: 12, padding: '.875rem 1rem', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: u.is_guest ? '#fef3c7' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
            {u.is_guest ? '👤' : '👨‍🌾'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#111827' }}>{u.name}</div>
            <div style={{ fontSize: '.78rem', color: '#6b7280', fontFamily: 'monospace' }}>{u.phone} {u.district ? `• ${u.district}` : ''}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '.72rem', color: '#9ca3af' }}>{u.created_at ? timeAgo(u.created_at) : ''}</div>
            <span style={{ background: u.is_guest ? '#fef3c7' : '#dcfce7', color: u.is_guest ? '#d97706' : '#16a34a', padding: '.1rem .45rem', borderRadius: 20, fontSize: '.68rem', fontWeight: 700 }}>
              {u.is_guest ? 'Guest' : 'Registered'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#2e5a27', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const tdStyle = { padding: '.75rem 1rem', borderBottom: '1px solid #f0f0f0', color: '#374151', verticalAlign: 'middle' };

function btnStyle(color, disabled = false) {
  return {
    padding: '.5rem 1rem', borderRadius: 8, border: 'none',
    background: disabled ? '#e5e7eb' : color, color: disabled ? '#9ca3af' : 'white',
    fontSize: '.8rem', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
    transition: 'all .2s'
  };
}

// ── Main Admin Panel ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',     label: '📊 Dashboard'     },
  { id: 'users',         label: '👥 Users'         },
  { id: 'chatlogs',      label: '💬 Questions'     },
  { id: 'announcements', label: '📢 Announcements' },
  { id: 'schemes',       label: '🏛️ Schemes'      },
  { id: 'prices',        label: '📈 Prices'        },
  { id: 'health',        label: '🏥 Health'        },
  { id: 'recent',        label: '🕒 Activity'      },
];


export default function AdminPanel({ onLogout }) {
  const [tab, setTab]     = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);

  const loadStats = () => {
    adminFetch('/stats')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setStats(d); setStatsError(false); })
      .catch(() => setStatsError(true));
  };

  useEffect(() => {
    loadStats();
    // Auto-refresh stats every 30 seconds
    const t = setInterval(loadStats, 30000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('dehati_admin_token');
    onLogout();
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #162410, #2e5a27)', color: 'white',
        padding: '0 1.5rem', display: 'flex', alignItems: 'center', height: 60,
        boxShadow: '0 2px 12px rgba(0,0,0,.2)', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flex: 1 }}>
          <div style={{ width: 36, height: 36, background: '#fbc02d', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🌾</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1 }}>DehatiAI Admin</div>
            <div style={{ fontSize: '.7rem', opacity: .75 }}>Management Panel</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '.78rem', opacity: .8 }}>
            {statsError
              ? '⚠️ Backend unreachable'
              : stats
                ? `${stats.totalUsers} users • ${stats.uptime} uptime`
                : 'Loading...'}
          </span>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: 'white', borderRadius: 8, padding: '.4rem .875rem', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 1.5rem', display: 'flex', gap: '.25rem', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '.875rem 1.1rem', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === t.id ? 700 : 500, fontSize: '.875rem', whiteSpace: 'nowrap',
              color: tab === t.id ? '#2e5a27' : '#6b7280', fontFamily: 'Inter, sans-serif',
              borderBottom: tab === t.id ? '2px solid #2e5a27' : '2px solid transparent',
              transition: 'all .2s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>

        {/* ── Dashboard ── */}
        {tab === 'dashboard' && (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', marginBottom: '1.25rem' }}>Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <StatCard icon="👥" label="Total Users"       value={stats?.totalUsers}       sub="All registrations" />
              <StatCard icon="👨‍🌾" label="Registered"       value={stats?.registeredUsers}  sub="Signed up" color="#16a34a" />
              <StatCard icon="👤" label="Guest Users"       value={stats?.guestUsers}       sub="Trial mode" color="#d97706" />
              <StatCard icon="📅" label="New Today"         value={stats?.newToday}         sub="Last 24 hours" color="#2563eb" />
              <StatCard icon="⚡" label="Cache Hit Rate"    value={stats?.aiCache?.hitRate}  sub={`${stats?.aiCache?.entries ?? 0} entries`} color="#7c3aed" />
              <StatCard icon="💾" label="Cache Hits"        value={stats?.aiCache?.hits}    sub={`${stats?.aiCache?.misses ?? 0} misses`} color="#059669" />
              <StatCard icon="⏱️" label="Uptime"            value={stats?.uptime}           sub="Server running" color="#7c3aed" />
              <StatCard icon="🔗" label="Node.js"           value={stats?.nodeVersion}      sub={stats?.environment} color="#374151" />
            </div>

            {/* Storage mode warning */}
            {stats && !stats.persistentDB && (
              <div style={{ background: '#fffbeb', border: '1.5px solid #fbbf24', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem', fontSize: '.875rem', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '.3rem' }}>⚠️ Memory-Only Storage — Data Lost on Restart</div>
                <div style={{ color: '#78350f' }}>User registrations are stored in RAM only. To save permanently: go to <strong>railway.app → your project → + New → Database → PostgreSQL</strong>. Railway will auto-set <code>DATABASE_URL</code> and data will persist forever.</div>
              </div>
            )}

            {statsError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem', color: '#dc2626', fontWeight: 600, fontSize: '.875rem' }}>
                ⚠️ Cannot reach backend. Check Railway deployment → ensure <code>FRONTEND_ORIGIN=https://dehati-ai.vercel.app</code> is set in Railway Variables.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', border: '1px solid #f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', marginBottom: '1rem' }}>🔧 Services</h3>
                {[
                  { label: 'Claude AI',    ok: stats?.claudeConfigured   },
                  { label: 'PostgreSQL DB',ok: stats?.postgresConfigured },
                  { label: 'Supabase',     ok: stats?.supabaseConfigured },
                  { label: 'Persistent DB',ok: stats?.persistentDB       },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '.5rem 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontSize: '.85rem', color: '#374151' }}>{s.label}</span>
                    <span style={{ fontWeight: 700, fontSize: '.8rem', color: s.ok ? '#16a34a' : '#dc2626' }}>{s.ok ? '✅ Configured' : '⚠️ Not Set'}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', border: '1px solid #f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', marginBottom: '1rem' }}>🚀 Quick Actions</h3>
                {[
                  { label: 'View All Users',    action: () => setTab('users'),   color: '#2e5a27' },
                  { label: 'User Questions',    action: () => setTab('chatlogs'),color: '#2563eb' },
                  { label: 'Edit Market Prices',action: () => setTab('prices'),  color: '#d97706' },
                  { label: 'Check Health',      action: () => setTab('health'),  color: '#7c3aed' },
                  { label: 'Recent Activity',   action: () => setTab('recent'),  color: '#2563eb' },
                ].map(a => (
                  <button key={a.label} onClick={a.action} style={{ display: 'block', width: '100%', marginBottom: '.5rem', padding: '.6rem 1rem', borderRadius: 8, border: 'none', background: `${a.color}12`, color: a.color, fontSize: '.875rem', fontWeight: 700, cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>
                    → {a.label}
                  </button>
                ))}
                <button
                  onClick={async () => {
                    await adminFetch('/cache/flush', { method: 'POST' });
                    alert('AI cache cleared!');
                    loadStats();
                  }}
                  style={{ display: 'block', width: '100%', padding: '.6rem 1rem', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '.875rem', fontWeight: 700, cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}
                >
                  🗑️ Clear AI Cache ({stats?.aiCache?.entries ?? 0} entries)
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'users'         && <><h2 style={h2}>Users Management</h2><UsersTab /></>}
        {tab === 'chatlogs'      && <><h2 style={h2}>User Questions Log</h2><ChatLogsTab /></>}
        {tab === 'announcements' && <><h2 style={h2}>Announcements</h2><AnnouncementsTab /></>}
        {tab === 'schemes'       && <><h2 style={h2}>Government Schemes</h2><SchemesTab /></>}
        {tab === 'prices'        && <><h2 style={h2}>Market Prices Editor</h2><PricesTab /></>}
        {tab === 'health'        && <><h2 style={h2}>System Health</h2><HealthTab /></>}
        {tab === 'recent'        && <><h2 style={h2}>Recent Registrations</h2><RecentTab /></>}

      </div>
    </div>
  );
}

const h2 = { fontSize: '1.2rem', fontWeight: 800, color: '#111827', marginBottom: '1.25rem' };

// ── Chat Logs Tab ────────────────────────────────────────────────────────────────────
function ChatLogsTab() {
  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await adminFetch(`/chatlogs?page=${page}&limit=30&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch { setLogs([]); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 30));

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' });
  }

  const langBadge = (lang) => {
    const map = { ur: { label: 'اردو', color: '#16a34a' }, pj: { label: 'پنجابی', color: '#d97706' }, en: { label: 'EN', color: '#2563eb' } };
    const cfg = map[lang] || { label: lang, color: '#6b7280' };
    return <span style={{ background: `${cfg.color}18`, color: cfg.color, borderRadius: 6, padding: '2px 8px', fontSize: '.72rem', fontWeight: 700 }}>{cfg.label}</span>;
  };

  return (
    <div>
      {/* Search + Stats */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search questions or user names..."
          style={{ flex: 1, minWidth: 200, padding: '.6rem 1rem', borderRadius: 8, border: '1.5px solid #e5e7eb', fontFamily: 'Inter, sans-serif', fontSize: '.875rem' }}
        />
        <span style={{ color: '#6b7280', fontSize: '.85rem', whiteSpace: 'nowrap' }}>
          Total: <strong>{total}</strong> questions
        </span>
        <button onClick={load} style={{ padding: '.5rem 1rem', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Loading...</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>💬</div>
          <div>No questions yet. Questions will appear here as users chat.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {logs.map(log => (
            <div key={log.id} style={{ background: 'white', borderRadius: 12, padding: '1rem 1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,.06)', border: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {langBadge(log.language)}
                  {log.user_name && (
                    <span style={{ fontWeight: 600, fontSize: '.82rem', color: '#111827' }}>👨‍🌾 {log.user_name}</span>
                  )}
                  {log.user_phone && (
                    <span style={{ fontSize: '.78rem', color: '#6b7280' }}>{log.user_phone}</span>
                  )}
                </div>
                <span style={{ fontSize: '.72rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>{formatDate(log.created_at)}</span>
              </div>
              <div style={{
                fontSize: '.9rem', color: '#111827', lineHeight: 1.7,
                fontFamily: log.language !== 'en' ? '"Noto Nastaliq Urdu", serif' : 'Inter, sans-serif',
                direction: log.language !== 'en' ? 'rtl' : 'ltr',
                background: '#f9fafb', borderRadius: 8, padding: '.6rem .875rem'
              }}>
                {log.question}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '.4rem .875rem', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', background: 'white', fontFamily: 'Inter, sans-serif' }}>
            ← Prev
          </button>
          <span style={{ padding: '.4rem .875rem', color: '#6b7280', fontSize: '.875rem' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '.4rem .875rem', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', background: 'white', fontFamily: 'Inter, sans-serif' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
