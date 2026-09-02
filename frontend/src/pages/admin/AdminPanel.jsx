import { useState, useEffect, useCallback } from 'react';
import { API_URL as API } from '../../config';

// Global CSS Injection
const GlobalStyles = () => (
  <style>{`
    @keyframes statusPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes ringFill {
      from { stroke-dashoffset: 251; }
    }
    @keyframes statusBlink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .admin-container {
      min-height: 100dvh;
      font-family: 'Inter', sans-serif;
      transition: background 0.3s ease;
    }
    .admin-container.light {
      background: #F8FAFC;
    }
    .admin-container.dark {
      background: #162410;
      color: #F1F5F9;
    }
    
    .glass-header {
      backdrop-filter: blur(20px);
      background: rgba(255, 255, 255, 0.7);
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }
    .dark .glass-header {
      background: rgba(15, 23, 42, 0.7);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    
    .pill-tab {
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.875rem;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.2s ease;
      background: transparent;
      border: none;
      color: #64748B;
    }
    .pill-tab:hover {
      background: rgba(0,0,0,0.05);
    }
    .dark .pill-tab:hover {
      background: rgba(255,255,255,0.05);
    }
    .pill-tab.active {
      background: #10B981;
      color: white;
    }
  `}</style>
);

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

// ── Clear Cache Modal ──────────────────────────────────────────────────────────
function ClearCacheModal({ entries, onConfirm, onCancel, dark }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: dark ? '#1E3A1E' : 'white',
        color: dark ? '#F1F5F9' : '#111827',
        padding: '2rem',
        borderRadius: 16,
        maxWidth: 400,
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        animation: 'cardIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Clear AI Cache?</h2>
        </div>
        <p style={{ color: dark ? '#94A3B8' : '#64748B', lineHeight: 1.5, marginBottom: '1.5rem' }}>
          This will delete <strong>{entries}</strong> cached entries. AI responses may be slower temporarily.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
            background: dark ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
            color: dark ? '#F1F5F9' : '#475569',
            fontWeight: 600, cursor: 'pointer'
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
            background: '#EF4444', color: 'white', fontWeight: 600, cursor: 'pointer'
          }}>Confirm Clear 🗑️</button>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card (Glassmorphism) ──────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = '#10B981', ring = false, ringPct = 0, dark = false }) {
  const bg = dark ? '#1E3A1E' : 'white';
  const borderCol = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textCol = dark ? '#F1F5F9' : '#162410';
  const subCol = dark ? '#94A3B8' : '#64748B';
  
  return (
    <div style={{
      background: bg,
      borderRadius: 16,
      padding: '1.5rem',
      border: `1px solid ${borderCol}`,
      borderLeft: `4px solid ${color}`,
      boxShadow: dark ? '0 4px 6px -1px rgba(0,0,0,0.2)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      transition: 'transform 0.2s',
      cursor: 'default',
      position: 'relative',
      overflow: 'hidden'
    }}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: subCol, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>{icon}</span> {label}
        </div>
        {ring && (
          <div style={{ position: 'absolute', right: '1rem', top: '1.25rem' }}>
            <svg width="48" height="48" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke={dark ? 'rgba(255,255,255,0.1)' : '#F1F5F9'} strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" 
                strokeDasharray="251" 
                strokeDashoffset={251 - (251 * ringPct) / 100} 
                strokeLinecap="round" 
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease-out' }}
              />
              <text x="50" y="55" fontSize="20" fontWeight="700" fill={textCol} textAnchor="middle">{ringPct}%</text>
            </svg>
          </div>
        )}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: textCol, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: subCol, marginTop: 'auto' }}>{sub}</div>}
    </div>
  );
}

// ── Health Badge (Redesigned) ──────────────────────────────────────────────────
function HealthBadge({ status, latency, dark }) {
  const cfg = {
    ok:             { bg: dark ? 'rgba(16,185,129,0.2)' : '#D1FAE5', color: '#10B981', label: 'Online' },
    error:          { bg: dark ? 'rgba(239,68,68,0.2)' : '#FEE2E2', color: '#EF4444', label: 'Error'  },
    not_configured: { bg: dark ? 'rgba(245,158,11,0.2)' : '#FEF3C7', color: '#F59E0B', label: 'Not Set'},
  }[status] || { bg: dark ? 'rgba(148,163,184,0.2)' : '#F1F5F9', color: '#94A3B8', label: 'Unknown' };

  return (
    <span style={{
      background: cfg.bg, color: cfg.color, borderRadius: 9999,
      padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', gap: '0.35rem',
      alignItems: 'center', border: `1px solid ${cfg.color}40`
    }}>
      <span style={{ 
        width: 6, height: 6, borderRadius: '50%', background: cfg.color,
        animation: status === 'error' ? 'statusBlink 1s infinite' : 'none'
      }}></span>
      {cfg.label}{latency != null ? ` (${latency}ms)` : ''}
    </span>
  );
}

const PUNJAB_DISTRICTS = ['lahore','faisalabad','multan','rawalpindi','gujranwala','sialkot','bahawalpur','sargodha','sheikhupura','rahim_yar_khan','jhang','gujrat','okara','sahiwal','kasur','dera_ghazi_khan','vehari','mianwali','khanewal','pakpattan'];

function AIUsageTab({ dark }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/ai-usage');
      const json = await res.json();
      setData(json);
    } catch {}
    setLoading(false);
  };
  
  useEffect(() => { load(); }, []);
  
  const card = (label, val, sub, color) => (
    <div style={{ background: dark ? '#162410' : '#f8fafc', borderRadius: 12, padding: '1rem', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}` }}>
      <div style={{ fontSize: '.75rem', color: dark ? '#94A3B8' : '#6b7280', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: color || (dark ? '#F1F5F9' : '#111827'), lineHeight: 1.2 }}>{val ?? '—'}</div>
      {sub && <div style={{ fontSize: '.72rem', color: dark ? '#64748B' : '#9ca3af', marginTop: 2 }}>{sub}</div>}
    </div>
  );
  
  const Section = ({ title, period }) => period ? (
    <div>
      <h3 style={{ fontWeight: 700, color: dark ? '#94A3B8' : '#374151', fontSize: '.875rem', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '.75rem', marginBottom: '1.5rem' }}>
        {card('API Calls', period.calls, 'Total requests', '#10B981')}
        {card('Input Tokens', period.tokensIn?.toLocaleString(), 'Farmer questions', '#3B82F6')}
        {card('Output Tokens', period.tokensOut?.toLocaleString(), 'AI responses', '#8B5CF6')}
        {card('Cache Tokens', period.cacheTokens?.toLocaleString(), 'Prompt cache reads', '#F59E0B')}
        {card('Cost (USD)', `$${period.costUsd?.toFixed(4)}`, 'Estimated spend', '#EF4444')}
      </div>
    </div>
  ) : null;
  
  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: dark ? '#64748B' : '#9ca3af' }}>Loading AI usage data...</div>;
  
  if (!data?.today) return (
    <div style={{ background: dark ? '#1E3A1E' : '#fffbeb', border: '1px solid #fbbf24', borderRadius: 12, padding: '1.5rem', color: '#92400e' }}>
      <div style={{ fontWeight: 700 }}>⚠️ AI Usage tracking requires PostgreSQL</div>
      <div style={{ fontSize: '.875rem', marginTop: '.5rem' }}>Add a Railway PostgreSQL plugin to enable token and cost tracking.</div>
    </div>
  );
  
  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #065F46, #10B981)', borderRadius: 16, padding: '1.25rem', color: 'white', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '.75rem', opacity: .8, fontWeight: 600 }}>ALL TIME TOTAL SPEND</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>${data.allTime?.costUsd?.toFixed(4) ?? '0.0000'}</div>
        <div style={{ fontSize: '.8rem', opacity: .75 }}>Based on Anthropic Claude Sonnet 4.x pricing ($3/$15 per M tokens)</div>
      </div>
      <Section title="Today (Last 24h)" period={data.today} />
      <Section title="This Month (30 Days)" period={data.month} />
      {data.recent?.length > 0 && (
        <div>
          <h3 style={{ fontWeight: 700, color: dark ? '#94A3B8' : '#374151', fontSize: '.875rem', marginBottom: '.75rem', textTransform: 'uppercase' }}>Recent API Calls</h3>
          <div style={{ background: dark ? '#1E3A1E' : 'white', borderRadius: 12, overflow: 'hidden', border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: dark ? '#162410' : '#f8fafc' }}>
                  {['Endpoint','Tokens In','Tokens Out','Cache','Cost','Time'].map(h => <th key={h} style={{ padding: '.5rem .75rem', textAlign: 'left', fontSize: '.72rem', fontWeight: 700, color: dark ? '#64748B' : '#9ca3af', textTransform: 'uppercase' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f0f0f0'}` }}>
                    <td style={{ padding: '.5rem .75rem', fontSize: '.8rem', color: dark ? '#F1F5F9' : '#111827', fontWeight: 600 }}>{r.endpoint}</td>
                    <td style={{ padding: '.5rem .75rem', fontSize: '.8rem', color: dark ? '#94A3B8' : '#374151' }}>{Number(r.tokens_in).toLocaleString()}</td>
                    <td style={{ padding: '.5rem .75rem', fontSize: '.8rem', color: dark ? '#94A3B8' : '#374151' }}>{Number(r.tokens_out).toLocaleString()}</td>
                    <td style={{ padding: '.5rem .75rem', fontSize: '.8rem', color: '#F59E0B' }}>{Number(r.cache_tokens).toLocaleString()}</td>
                    <td style={{ padding: '.5rem .75rem', fontSize: '.8rem', color: '#EF4444', fontWeight: 700 }}>${parseFloat(r.cost_usd).toFixed(6)}</td>
                    <td style={{ padding: '.5rem .75rem', fontSize: '.72rem', color: dark ? '#64748B' : '#9ca3af' }}>{new Date(r.created_at).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditLogTab({ dark }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  
  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/audit-logs?page=${page}&limit=30`);
      const d = await res.json();
      setLogs(d.logs || []);
      setTotal(d.total || 0);
    } catch {}
    setLoading(false);
  };
  
  useEffect(() => { load(); }, [page]);
  
  const ACTION_COLORS = {
    USER_DELETED: '#EF4444',
    CACHE_FLUSHED: '#F59E0B',
    PRICE_UPDATE: '#3B82F6',
    EMERGENCY_ALERT_CREATED: '#EF4444',
    EMERGENCY_ALERT_DELETED: '#6B7280',
    DATA_EXPORT: '#10B981',
    CHAT_LOGS_PURGED: '#F59E0B',
  };
  
  const totalPages = Math.max(1, Math.ceil(total / 30));
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ fontSize: '.875rem', color: dark ? '#64748B' : '#6b7280' }}>Immutable log of all admin actions — {total} total entries</div>
        <button onClick={load} style={{ padding: '.4rem .875rem', borderRadius: 8, border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, background: 'transparent', color: dark ? '#94A3B8' : '#374151', cursor: 'pointer', fontSize: '.8rem' }}>🔄 Refresh</button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: dark ? '#64748B' : '#9ca3af' }}>Loading...</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: dark ? '#64748B' : '#9ca3af', background: dark ? '#1E3A1E' : 'white', borderRadius: 12, border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}` }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📋</div>
          <div>No audit logs yet. Actions will appear here as admins make changes.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {logs.map(log => (
            <div key={log.id} style={{ background: dark ? '#1E3A1E' : 'white', borderRadius: 10, padding: '.875rem 1rem', border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ background: `${ACTION_COLORS[log.action_type] || '#6B7280'}18`, color: ACTION_COLORS[log.action_type] || '#6B7280', borderRadius: 6, padding: '2px 10px', fontSize: '.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{log.action_type}</span>
              {log.target && <span style={{ fontSize: '.82rem', color: dark ? '#F1F5F9' : '#111827', fontWeight: 600 }}>{log.target}</span>}
              {log.ip_address && <span style={{ fontSize: '.75rem', color: dark ? '#475569' : '#9ca3af', fontFamily: 'monospace' }}>IP: {log.ip_address}</span>}
              <span style={{ fontSize: '.72rem', color: dark ? '#475569' : '#9ca3af', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center', marginTop: '1rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '.4rem .875rem', borderRadius: 8, border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, background: 'transparent', color: dark ? '#94A3B8' : '#374151', cursor: 'pointer' }}>← Prev</button>
          <span style={{ padding: '.4rem .875rem', color: dark ? '#64748B' : '#6b7280', fontSize: '.875rem' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '.4rem .875rem', borderRadius: 8, border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, background: 'transparent', color: dark ? '#94A3B8' : '#374151', cursor: 'pointer' }}>Next →</button>
        </div>
      )}
    </div>
  );
}

function EmergencyAlertsTab({ dark }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', body: '', severity: 'WARNING', targetDistricts: [], expiresAt: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  
  const load = async () => {
    setLoading(true);
    try { const res = await adminFetch('/emergency-alerts'); const d = await res.json(); setAlerts(d.alerts || []); } catch {}
    setLoading(false);
  };
  
  useEffect(() => { load(); }, []);
  
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      const res = await adminFetch('/emergency-alerts', { method: 'POST', body: JSON.stringify(form) });
      if (res.ok) { flash('✅ Alert broadcast successfully!'); setForm({ title: '', body: '', severity: 'WARNING', targetDistricts: [], expiresAt: '' }); load(); }
      else flash('❌ Failed to broadcast alert');
    } catch { flash('❌ Network error'); }
    setSaving(false);
  };
  
  const handleDelete = async (id) => {
    if (!confirm('Delete this emergency alert?')) return;
    await adminFetch(`/emergency-alerts/${id}`, { method: 'DELETE' });
    load();
  };
  
  const toggleDistrict = (d) => setForm(f => ({ ...f, targetDistricts: f.targetDistricts.includes(d) ? f.targetDistricts.filter(x => x !== d) : [...f.targetDistricts, d] }));
  
  const SEV_COLOR = { INFO: '#3B82F6', WARNING: '#F59E0B', CRITICAL: '#EF4444' };
  const inp = { width: '100%', padding: '.6rem .875rem', borderRadius: 8, border: `1.5px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, background: dark ? '#162410' : 'white', color: dark ? '#F1F5F9' : '#111827', fontSize: '.875rem', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', outline: 'none' };
  
  return (
    <div>
      {msg && <div style={{ background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: msg.startsWith('✅') ? '#16a34a' : '#dc2626', padding: '.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontWeight: 600, fontSize: '.875rem' }}>{msg}</div>}
      
      {/* Broadcast Form */}
      <div style={{ background: dark ? '#1E3A1E' : 'white', borderRadius: 16, padding: '1.5rem', border: `1.5px solid ${dark ? 'rgba(239,68,68,0.3)' : '#fecaca'}`, marginBottom: '1.5rem' }}>
        <h3 style={{ fontWeight: 700, color: '#EF4444', fontSize: '1rem', marginBottom: '1rem' }}>🚨 Broadcast Emergency Alert</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '.75rem' }}>
            <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: dark ? '#94A3B8' : '#374151', marginBottom: '.3rem' }}>Alert Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="ملتان میں گلابی سنڈی کا حملہ" style={inp} required />
          </div>
          <div style={{ marginBottom: '.75rem' }}>
            <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: dark ? '#94A3B8' : '#374151', marginBottom: '.3rem' }}>Alert Body * (Urdu)</label>
            <textarea value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))} placeholder="فوری سپرے کریں..." rows={3} style={{ ...inp, resize: 'vertical', direction: 'rtl' }} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: dark ? '#94A3B8' : '#374151', marginBottom: '.3rem' }}>Severity</label>
              <select value={form.severity} onChange={e => setForm(f => ({...f, severity: e.target.value}))} style={inp}>
                <option value="INFO">ℹ️ INFO</option>
                <option value="WARNING">⚠️ WARNING</option>
                <option value="CRITICAL">🚨 CRITICAL</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: dark ? '#94A3B8' : '#374151', marginBottom: '.3rem' }}>Expires At (optional)</label>
              <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({...f, expiresAt: e.target.value}))} style={inp} />
            </div>
          </div>
          <div style={{ marginBottom: '.75rem' }}>
            <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: dark ? '#94A3B8' : '#374151', marginBottom: '.5rem' }}>Target Districts (empty = all Punjab)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
              {PUNJAB_DISTRICTS.map(d => (
                <button type="button" key={d} onClick={() => toggleDistrict(d)} style={{ padding: '.3rem .7rem', borderRadius: 20, border: '1.5px solid', borderColor: form.targetDistricts.includes(d) ? '#EF4444' : (dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'), background: form.targetDistricts.includes(d) ? '#FEF2F2' : 'transparent', color: form.targetDistricts.includes(d) ? '#EF4444' : (dark ? '#94A3B8' : '#6b7280'), fontSize: '.72rem', fontWeight: form.targetDistricts.includes(d) ? 700 : 400, cursor: 'pointer', textTransform: 'capitalize' }}>{d.replace('_', ' ')}</button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving || !form.title.trim() || !form.body.trim()} style={{ padding: '.7rem 1.5rem', background: saving ? '#e5e7eb' : '#EF4444', color: saving ? '#9ca3af' : 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '.875rem', fontFamily: 'Inter, sans-serif' }}>
            {saving ? 'Broadcasting...' : '🚨 Broadcast Alert'}
          </button>
        </form>
      </div>
      
      {/* Active Alerts List */}
      <h3 style={{ fontWeight: 700, color: dark ? '#F1F5F9' : '#111827', fontSize: '1rem', marginBottom: '.75rem' }}>Active Alerts ({alerts.length})</h3>
      {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: dark ? '#64748B' : '#9ca3af' }}>Loading...</div> : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: dark ? '#64748B' : '#9ca3af', background: dark ? '#1E3A1E' : 'white', borderRadius: 12, border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}` }}>No active emergency alerts.</div>
      ) : alerts.map(a => (
        <div key={a.id} style={{ background: dark ? '#1E3A1E' : 'white', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '.75rem', border: `1.5px solid ${SEV_COLOR[a.severity]}44` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
                <span style={{ background: `${SEV_COLOR[a.severity]}18`, color: SEV_COLOR[a.severity], borderRadius: 6, padding: '2px 10px', fontSize: '.72rem', fontWeight: 700 }}>{a.severity}</span>
                <span style={{ fontWeight: 700, fontSize: '.9rem', color: dark ? '#F1F5F9' : '#111827' }}>{a.title}</span>
              </div>
              <div style={{ fontSize: '.85rem', color: dark ? '#94A3B8' : '#374151', direction: 'rtl', lineHeight: 1.6 }}>{a.body}</div>
              {a.target_districts?.length > 0 && <div style={{ fontSize: '.72rem', color: dark ? '#64748B' : '#9ca3af', marginTop: '.4rem' }}>Districts: {a.target_districts.join(', ')}</div>}
              <div style={{ fontSize: '.72rem', color: dark ? '#475569' : '#9ca3af', marginTop: '.3rem' }}>{new Date(a.created_at).toLocaleString('en-PK')}</div>
            </div>
            <button onClick={() => handleDelete(a.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '.35rem .7rem', cursor: 'pointer', fontSize: '.75rem', fontWeight: 700, flexShrink: 0 }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExportTab({ dark }) {
  const [exporting, setExporting] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeDays, setPurgeDays] = useState(90);
  const [msg, setMsg] = useState('');
  
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };
  
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await adminFetch('/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dehati_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      flash(`✅ Exported: ${data.users?.length || 0} users, ${data.prices?.length || 0} prices, ${data.chatLogs?.length || 0} chat logs`);
    } catch { flash('❌ Export failed'); }
    setExporting(false);
  };
  
  const handlePurge = async () => {
    if (!confirm(`Permanently delete all chat logs older than ${purgeDays} days? This cannot be undone.`)) return;
    setPurging(true);
    try {
      const res = await adminFetch(`/logs/purge?days=${purgeDays}`, { method: 'DELETE' });
      const d = await res.json();
      flash(`✅ Purged ${d.purged || 0} old chat log entries`);
    } catch { flash('❌ Purge failed'); }
    setPurging(false);
  };
  
  const cardStyle = { background: dark ? '#1E3A1E' : 'white', borderRadius: 16, padding: '1.5rem', border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`, marginBottom: '1rem' };
  
  return (
    <div>
      {msg && <div style={{ background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: msg.startsWith('✅') ? '#16a34a' : '#dc2626', padding: '.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontWeight: 600, fontSize: '.875rem' }}>{msg}</div>}
      
      <div style={cardStyle}>
        <h3 style={{ fontWeight: 700, color: dark ? '#10B981' : '#059669', fontSize: '1rem', marginBottom: '.5rem' }}>💾 Full Database Backup</h3>
        <p style={{ fontSize: '.875rem', color: dark ? '#64748B' : '#6b7280', marginBottom: '1rem' }}>Download a complete JSON snapshot of all users, market prices, chat logs, and emergency alerts. Store this securely as your disaster recovery backup.</p>
        <button onClick={handleExport} disabled={exporting} style={{ padding: '.75rem 1.5rem', background: exporting ? '#e5e7eb' : '#10B981', color: exporting ? '#9ca3af' : 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: exporting ? 'not-allowed' : 'pointer', fontSize: '.875rem', fontFamily: 'Inter, sans-serif' }}>
          {exporting ? 'Preparing export...' : '⬇️ Download Full Backup (JSON)'}
        </button>
      </div>
      
      <div style={{ ...cardStyle, border: `1.5px solid ${dark ? 'rgba(239,68,68,0.2)' : '#fecaca'}` }}>
        <h3 style={{ fontWeight: 700, color: '#EF4444', fontSize: '1rem', marginBottom: '.5rem' }}>🗑️ Chat Log Retention Purge</h3>
        <p style={{ fontSize: '.875rem', color: dark ? '#64748B' : '#6b7280', marginBottom: '1rem' }}>Permanently delete chat logs older than a certain number of days to prevent database bloat and ensure user privacy compliance.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <label style={{ fontSize: '.875rem', fontWeight: 600, color: dark ? '#94A3B8' : '#374151' }}>Delete logs older than:</label>
            <select value={purgeDays} onChange={e => setPurgeDays(parseInt(e.target.value))} style={{ padding: '.4rem .75rem', borderRadius: 8, border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, background: dark ? '#0F172A' : 'white', color: dark ? '#F1F5F9' : '#111827', fontFamily: 'Inter, sans-serif', fontSize: '.875rem' }}>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
            </select>
          </div>
          <button onClick={handlePurge} disabled={purging} style={{ padding: '.6rem 1.25rem', background: purging ? '#e5e7eb' : '#FEF2F2', color: purging ? '#9ca3af' : '#dc2626', border: '1.5px solid #fecaca', borderRadius: 10, fontWeight: 700, cursor: purging ? 'not-allowed' : 'pointer', fontSize: '.875rem', fontFamily: 'Inter, sans-serif' }}>
            {purging ? 'Purging...' : '⚠️ Purge Old Logs'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Panel ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',     label: 'Dashboard'     },
  { id: 'users',         label: 'Users'         },
  { id: 'chatlogs',      label: 'Questions'     },
  { id: 'announcements', label: 'Announcements' },
  { id: 'schemes',       label: 'Schemes'      },
  { id: 'prices',        label: 'Prices'        },
  { id: 'health',        label: 'Health'        },
  { id: 'recent',        label: 'Activity'      },
  { id: 'ai-usage',  label: '🤖 AI Costs'    },
  { id: 'audit',     label: '🔒 Audit Log'   },
  { id: 'emergency', label: '🚨 Alerts'      },
  { id: 'export',    label: '💾 Export'      },
];

export default function AdminPanel({ onLogout }) {
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [dark, setDark] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  const loadStats = () => {
    adminFetch('/stats')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { 
        setStats(d); 
        setStatsError(false);
        if (d.uptimeSeconds) {
          setUptimeSeconds(d.uptimeSeconds);
        } else {
            // basic parser for "7h 47m" format
            if (d.uptime && typeof d.uptime === 'string') {
                let s = 0;
                const hm = d.uptime.match(/(\d+)h\s*(\d+)m/);
                if (hm) { s = parseInt(hm[1])*3600 + parseInt(hm[2])*60; }
                setUptimeSeconds(s);
            }
        }
      })
      .catch(() => setStatsError(true));
  };

  useEffect(() => {
    loadStats();
    const t = setInterval(loadStats, 30000);
    return () => clearInterval(t);
  }, []);

  // Live ticking uptime
  useEffect(() => {
    const t = setInterval(() => {
      setUptimeSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const formatUptime = (secs) => {
    if (!secs) return stats?.uptime || '—';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const handleLogout = () => {
    sessionStorage.removeItem('dehati_admin_token');
    onLogout();
  };

  const handleClearCache = async () => {
    try {
      await adminFetch('/cache/flush', { method: 'POST' });
      loadStats();
    } catch (err) {
      alert('Failed to clear cache: ' + err.message);
    } finally {
      setShowClearModal(false);
    }
  };

  const textPrimary = dark ? '#F1F5F9' : '#111827';
  const textSecondary = dark ? '#94A3B8' : '#6B7280';
  const cardBg = dark ? '#1E3A1E' : 'white';
  const borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <div className={`admin-container ${dark ? 'dark' : 'light'}`}>
      <GlobalStyles />
      
      {showClearModal && (
        <ClearCacheModal 
          entries={stats?.aiCache?.entries ?? 0} 
          onConfirm={handleClearCache} 
          onCancel={() => setShowClearModal(false)} 
          dark={dark} 
        />
      )}

      {/* Top Header */}
      <div className="glass-header" style={{
        padding: '0 1.5rem', display: 'flex', alignItems: 'center', height: 64,
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <div style={{ width: 36, height: 36, background: '#10B981', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 2px 10px rgba(16,185,129,0.3)' }}>🌾</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1, color: textPrimary }}>DehatiAI Admin</div>
            <div style={{ fontSize: '0.7rem', color: textSecondary, fontWeight: 600 }}>Management Panel</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Status indicators */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', padding: '0.4rem 1rem', borderRadius: 9999 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: textSecondary }}>
              👥 Users: {stats?.totalUsers || 0}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: textSecondary }}>
              •
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: textSecondary }}>
              ⏱️ Uptime: {formatUptime(uptimeSeconds)}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: textSecondary }}>
              •
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'statusPulse 2s infinite' }}></span>
              Live
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '0.4rem', borderRadius: '50%' }}>🔔</button>
            <button onClick={() => setDark(!dark)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '0.4rem', borderRadius: '50%' }}>
              {dark ? '☀️' : '🌙'}
            </button>
            <button onClick={handleLogout} style={{
              marginLeft: '0.5rem', background: '#EF4444', color: 'white', borderRadius: 8, padding: '0.4rem 0.875rem',
              border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'background 0.2s'
            }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ 
        padding: '1rem 1.5rem', display: 'flex', gap: '0.5rem', overflowX: 'auto',
        borderBottom: `1px solid ${borderColor}`,
        background: dark ? '#162410' : 'white'
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pill-tab ${tab === t.id ? 'active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {tab === 'dashboard' && (
          <div style={{ animation: 'cardIn 0.3s ease-out' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: textPrimary, marginBottom: '1.5rem' }}>Overview</h2>
            
            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <StatCard dark={dark} ring ringPct={stats?.aiCache?.hitRate || 0} icon="⚡" label="Cache Hit Rate" value={`${stats?.aiCache?.hitRate || 0}%`} sub={`${stats?.aiCache?.entries ?? 0} entries`} color="#10B981" />
              <StatCard dark={dark} icon="📅" label="New Registrations Today" value={stats?.newToday} sub="Last 24h" color="#3B82F6" />
              <StatCard dark={dark} icon="👨‍🌾" label="Total Registered Farmers" value={stats?.registeredUsers ?? stats?.totalUsers} sub="All time" color="#8B5CF6" />
              <StatCard dark={dark} icon="📋" label="Total Questions Asked" value={stats?.totalQuestions ?? '—'} sub="All chat logs" color="#F59E0B" />
              <StatCard dark={dark} icon="🔗" label="Environment" value={stats?.nodeVersion || 'v20'} sub={stats?.environment || 'Production'} color="#64748B" />
              <StatCard dark={dark} icon="⏱️" label="System Uptime" value={formatUptime(uptimeSeconds)} sub="Continuous" color="#EC4899" />
              <StatCard dark={dark} icon="💾" label="Cache Hits" value={stats?.aiCache?.hits || 0} sub={`${stats?.aiCache?.misses ?? 0} misses`} color="#14B8A6" />
              <StatCard dark={dark} icon="💰" label="AI Cost Today" value={`$${stats?.costToday?.toFixed(4) ?? '0.0000'}`} sub="Claude API spend" color="#EF4444" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
              
              {/* Services Monitoring Panel */}
              <div style={{ background: cardBg, borderRadius: 16, padding: '1.5rem', border: `1px solid ${borderColor}`, boxShadow: dark ? '0 4px 6px -1px rgba(0,0,0,0.2)' : '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', color: textPrimary, marginBottom: '1.25rem' }}>🔧 Services Monitor</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { name: 'Claude AI', icon: '🤖', ok: stats?.claudeConfigured },
                    { name: 'PostgreSQL', icon: '🐘', ok: stats?.postgresConfigured },
                    { name: 'Supabase', icon: '🗄️', ok: stats?.supabaseConfigured },
                    { name: 'Persistent DB', icon: '💾', ok: stats?.persistentDB },
                  ].map(s => (
                    <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: dark ? 'rgba(0,0,0,0.2)' : '#F8FAFC', borderRadius: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>{s.icon}</span>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: textPrimary }}>{s.name}</span>
                      </div>
                      <HealthBadge dark={dark} status={s.ok ? 'ok' : 'error'} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div style={{ background: cardBg, borderRadius: 16, padding: '1.5rem', border: `1px solid ${borderColor}`, boxShadow: dark ? '0 4px 6px -1px rgba(0,0,0,0.2)' : '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', color: textPrimary, marginBottom: '1.25rem' }}>🚀 Quick Actions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {[
                    { label: 'View All Users',    action: () => setTab('users'),   color: '#10B981' },
                    { label: 'User Questions',    action: () => setTab('chatlogs'),color: '#3B82F6' },
                    { label: 'Edit Market Prices',action: () => setTab('prices'),  color: '#F59E0B' },
                    { label: 'Check Health',      action: () => setTab('health'),  color: '#8B5CF6' },
                    { label: 'Recent Activity',   action: () => setTab('recent'),  color: '#06B6D4' },
                  ].map(a => (
                    <button key={a.label} onClick={a.action} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem', borderRadius: 12, border: 'none', background: dark ? 'rgba(0,0,0,0.2)' : '#F8FAFC',
                      color: textPrimary, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                      borderLeft: `4px solid ${a.color}`, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      {a.label} <span style={{ color: a.color }}>→</span>
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setShowClearModal(true)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem', borderRadius: 12, border: 'none', background: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
                      color: '#EF4444', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                      borderLeft: `4px solid #EF4444`, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Clear AI Cache <span style={{ color: '#EF4444' }}>🗑️</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        <div style={{ color: textPrimary }}>
          {tab === 'users'         && <><h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Users Management</h2><UsersTab /></>}
          {tab === 'chatlogs'      && <><h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>User Questions Log</h2><ChatLogsTab /></>}
          {tab === 'announcements' && <><h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Announcements</h2><AnnouncementsTab /></>}
          {tab === 'schemes'       && <><h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Government Schemes</h2><SchemesTab /></>}
          {tab === 'prices'        && <><h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Market Prices Editor</h2><PricesTab /></>}
          {tab === 'health'        && <><h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>System Health</h2><HealthTab /></>}
          {tab === 'recent'        && <><h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Recent Registrations</h2><RecentTab /></>}
          {tab === 'ai-usage'      && <><h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>AI Token & Cost Usage</h2><AIUsageTab dark={dark} /></>}
          {tab === 'audit'         && <><h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Admin Audit Log</h2><AuditLogTab dark={dark} /></>}
          {tab === 'emergency'     && <><h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Emergency Alert Dispatcher</h2><EmergencyAlertsTab dark={dark} /></>}
          {tab === 'export'        && <><h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Database Export & Backup</h2><ExportTab dark={dark} /></>}
        </div>
      </div>
    </div>
  );
}

// ── Users Tab ──────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [msg, setMsg]           = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
    if (!confirm(`Delete farmer "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await adminFetch(`/users/${id}`, { method: 'DELETE' });
      setMsg(`✅ Farmer "${name}" deleted`);
      load();
    } catch { setMsg('❌ Delete failed'); }
    setDeleting(null);
    setTimeout(() => setMsg(''), 3000);
  };

  const exportCSV = () => {
    const csv = [
      ['Name', 'Phone', 'District', 'Land (acres)', 'Registered At'],
      ...users.map(u => [
        `"${u.name}"`, u.phone, u.district || '', u.land_size || '',
        u.created_at?.split('T')[0] || ''
      ])
    ].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dehati_farmers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const totalAcres = users.reduce((s, u) => s + (parseFloat(u.land_size) || 0), 0);

  // District breakdown from current page
  const districtMap = {};
  users.forEach(u => { if (u.district) districtMap[u.district] = (districtMap[u.district] || 0) + 1; });
  const topDistricts = Object.entries(districtMap).sort((a,b) => b[1]-a[1]).slice(0, 5);

  return (
    <div>
      {/* Quick stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '.75rem', marginBottom: '1.25rem' }}>
        {[
          { icon: '👨‍🌾', label: 'Total Farmers', value: total, color: '#10B981' },
          { icon: '🌾', label: 'Acres (this page)', value: totalAcres.toFixed(0) + ' ac', color: '#3B82F6' },
          { icon: '📋', label: 'Showing', value: `${users.length} of ${total}`, color: '#8B5CF6' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: 10, padding: '.875rem 1rem', border: `1px solid #f0f0f0`, borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '.72rem', color: '#6b7280', fontWeight: 600 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="🔍 Search name or phone..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 200, padding: '.6rem 1rem', borderRadius: 10, border: '2px solid #e5e7eb', fontSize: '.875rem', fontFamily: 'Inter, sans-serif' }}
        />
        <button onClick={load} style={btnStyle('#0369a1')}>🔄 Refresh</button>
        <button onClick={exportCSV} style={btnStyle('#2e5a27')}>⬇ Export CSV</button>
      </div>

      {msg && <div style={{ background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: msg.startsWith('✅') ? '#16a34a' : '#dc2626', padding: '.6rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '.875rem', fontWeight: 600 }}>{msg}</div>}

      {loading ? <Spinner /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['#', 'Name', 'Phone', 'District', 'Land', 'Joined', 'Action'].map(h => (
                  <th key={h} style={{ padding: '.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id}
                  style={{ background: i % 2 ? '#fafafa' : 'white', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#fafafa' : 'white'}
                >
                  <td style={{ ...tdStyle, color: '#9ca3af', fontSize: '.75rem' }}>{(page-1)*15 + i + 1}</td>
                  <td style={tdStyle}><strong>{u.name}</strong></td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '.8rem' }}>{u.phone}</td>
                  <td style={tdStyle}>
                    {u.district
                      ? <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, padding: '2px 8px', fontSize: '.72rem', fontWeight: 600 }}>{u.district}</span>
                      : <span style={{ color: '#d1d5db' }}>—</span>
                    }
                  </td>
                  <td style={tdStyle}>
                    {u.land_size
                      ? <span style={{ fontWeight: 700, color: '#15803d' }}>{u.land_size} ac</span>
                      : <span style={{ color: '#d1d5db' }}>—</span>
                    }
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#6b7280', fontSize: '.8rem' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
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
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No farmers found</td></tr>
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
                <button onClick={() => openEdit(s)} style={{ ...btnStyle('#2e5a27'), padding: '.3rem .65rem', fontSize: '.75rem' }}>Edit</button>
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

