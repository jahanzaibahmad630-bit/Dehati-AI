import re

with open(r'c:\Dehati AI\frontend\src\pages\admin\AdminPanel.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# adminFetch is lines 6-23
admin_fetch = re.search(r'async function adminFetch.*?return res;\n}', text, re.DOTALL).group(0)

# UsersTab to RecentTab + Helpers
tabs_and_helpers = re.search(r'// ── Users Tab.*?// ── Main Admin Panel', text, re.DOTALL).group(0).replace('// ── Main Admin Panel', '')

# ChatLogsTab is from '// ── Chat Logs Tab' to the end
chat_logs = re.search(r'// ── Chat Logs Tab.*', text, re.DOTALL).group(0)

new_content = f'''import {{ useState, useEffect, useCallback }} from 'react';
import {{ API_URL as API }} from '../../config';

// Global CSS Injection
const GlobalStyles = () => (
  <style>{{`
    @keyframes statusPulse {{
      0%, 100% {{ opacity: 1; transform: scale(1); }}
      50% {{ opacity: 0.5; transform: scale(0.85); }}
    }}
    @keyframes cardIn {{
      from {{ opacity: 0; transform: translateY(12px); }}
      to {{ opacity: 1; transform: translateY(0); }}
    }}
    @keyframes ringFill {{
      from {{ stroke-dashoffset: 251; }}
    }}
    @keyframes statusBlink {{
      0%, 100% {{ opacity: 1; }}
      50% {{ opacity: 0.5; }}
    }}
    
    .admin-container {{
      min-height: 100dvh;
      font-family: 'Inter', sans-serif;
      transition: background 0.3s ease;
    }}
    .admin-container.light {{
      background: #F8FAFC;
    }}
    .admin-container.dark {{
      background: #0F172A;
      color: #F1F5F9;
    }}
    
    .glass-header {{
      backdrop-filter: blur(20px);
      background: rgba(255, 255, 255, 0.7);
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }}
    .dark .glass-header {{
      background: rgba(15, 23, 42, 0.7);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }}
    
    .pill-tab {{
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
    }}
    .pill-tab:hover {{
      background: rgba(0,0,0,0.05);
    }}
    .dark .pill-tab:hover {{
      background: rgba(255,255,255,0.05);
    }}
    .pill-tab.active {{
      background: #10B981;
      color: white;
    }}
  `}}</style>
);

{admin_fetch}

// ── Clear Cache Modal ──────────────────────────────────────────────────────────
function ClearCacheModal({{ entries, onConfirm, onCancel, dark }}) {{
  return (
    <div style={{{{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}}}>
      <div style={{{{
        background: dark ? '#1E293B' : 'white',
        color: dark ? '#F1F5F9' : '#111827',
        padding: '2rem',
        borderRadius: 16,
        maxWidth: 400,
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        animation: 'cardIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)'
      }}}}>
        <div style={{{{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}}}>
          <div style={{{{ fontSize: '2rem' }}}}>⚠️</div>
          <h2 style={{{{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}}}>Clear AI Cache?</h2>
        </div>
        <p style={{{{ color: dark ? '#94A3B8' : '#64748B', lineHeight: 1.5, marginBottom: '1.5rem' }}}}>
          This will delete <strong>{{entries}}</strong> cached entries. AI responses may be slower temporarily.
        </p>
        <div style={{{{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}}}>
          <button onClick={{onCancel}} style={{{{
            padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
            background: dark ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
            color: dark ? '#F1F5F9' : '#475569',
            fontWeight: 600, cursor: 'pointer'
          }}}}>Cancel</button>
          <button onClick={{onConfirm}} style={{{{
            padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
            background: '#EF4444', color: 'white', fontWeight: 600, cursor: 'pointer'
          }}}}>Confirm Clear 🗑️</button>
        </div>
      </div>
    </div>
  );
}}

// ── Stat Card (Glassmorphism) ──────────────────────────────────────────────────
function StatCard({{ icon, label, value, sub, color = '#10B981', ring = false, ringPct = 0, dark = false }}) {{
  const bg = dark ? '#1E293B' : 'white';
  const borderCol = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textCol = dark ? '#F1F5F9' : '#0F172A';
  const subCol = dark ? '#94A3B8' : '#64748B';
  
  return (
    <div style={{{{
      background: bg,
      borderRadius: 16,
      padding: '1.5rem',
      border: `1px solid ${{borderCol}}`,
      borderLeft: `4px solid ${{color}}`,
      boxShadow: dark ? '0 4px 6px -1px rgba(0,0,0,0.2)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      transition: 'transform 0.2s',
      cursor: 'default',
      position: 'relative',
      overflow: 'hidden'
    }}}}
    onMouseEnter={{(e) => e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'}}
    onMouseLeave={{(e) => e.currentTarget.style.transform = 'translateY(0) scale(1)'}}
    >
      <div style={{{{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}}}>
        <div style={{{{ fontSize: '0.875rem', fontWeight: 600, color: subCol, display: 'flex', alignItems: 'center', gap: '0.5rem' }}}}>
          <span>{{icon}}</span> {{label}}
        </div>
        {{ring && (
          <div style={{{{ position: 'absolute', right: '1rem', top: '1.25rem' }}}}>
            <svg width="48" height="48" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke={{dark ? 'rgba(255,255,255,0.1)' : '#F1F5F9'}} strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none" stroke={{color}} strokeWidth="8" 
                strokeDasharray="251" 
                strokeDashoffset={{251 - (251 * ringPct) / 100}} 
                strokeLinecap="round" 
                style={{{{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease-out' }}}}
              />
              <text x="50" y="55" fontSize="20" fontWeight="700" fill={{textCol}} textAnchor="middle">{{ringPct}}%</text>
            </svg>
          </div>
        )}}
      </div>
      <div style={{{{ fontSize: '2rem', fontWeight: 800, color: textCol, lineHeight: 1 }}}}>{{value ?? '—'}}</div>
      {{sub && <div style={{{{ fontSize: '0.75rem', color: subCol, marginTop: 'auto' }}}}>{{sub}}</div>}}
    </div>
  );
}}

// ── Health Badge (Redesigned) ──────────────────────────────────────────────────
function HealthBadge({{ status, latency, dark }}) {{
  const cfg = {{
    ok:             {{ bg: dark ? 'rgba(16,185,129,0.2)' : '#D1FAE5', color: '#10B981', label: 'Online' }},
    error:          {{ bg: dark ? 'rgba(239,68,68,0.2)' : '#FEE2E2', color: '#EF4444', label: 'Error'  }},
    not_configured: {{ bg: dark ? 'rgba(245,158,11,0.2)' : '#FEF3C7', color: '#F59E0B', label: 'Not Set'}},
  }}[status] || {{ bg: dark ? 'rgba(148,163,184,0.2)' : '#F1F5F9', color: '#94A3B8', label: 'Unknown' }};

  return (
    <span style={{{{
      background: cfg.bg, color: cfg.color, borderRadius: 9999,
      padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', gap: '0.35rem',
      alignItems: 'center', border: `1px solid ${{cfg.color}}40`
    }}}}>
      <span style={{{{ 
        width: 6, height: 6, borderRadius: '50%', background: cfg.color,
        animation: status === 'error' ? 'statusBlink 1s infinite' : 'none'
      }}}}></span>
      {{cfg.label}}{{latency != null ? ` (${{latency}}ms)` : ''}}
    </span>
  );
}}

// ── Main Admin Panel ───────────────────────────────────────────────────────────
const TABS = [
  {{ id: 'dashboard',     label: 'Dashboard'     }},
  {{ id: 'users',         label: 'Users'         }},
  {{ id: 'chatlogs',      label: 'Questions'     }},
  {{ id: 'announcements', label: 'Announcements' }},
  {{ id: 'schemes',       label: 'Schemes'      }},
  {{ id: 'prices',        label: 'Prices'        }},
  {{ id: 'health',        label: 'Health'        }},
  {{ id: 'recent',        label: 'Activity'      }},
];

export default function AdminPanel({{ onLogout }}) {{
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [dark, setDark] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  const loadStats = () => {{
    adminFetch('/stats')
      .then(r => {{ if (!r.ok) throw new Error(`HTTP ${{r.status}}`); return r.json(); }})
      .then(d => {{ 
        setStats(d); 
        setStatsError(false);
        if (d.uptimeSeconds) {{
          setUptimeSeconds(d.uptimeSeconds);
        }} else {{
            // basic parser for "7h 47m" format
            if (d.uptime && typeof d.uptime === 'string') {{
                let s = 0;
                const hm = d.uptime.match(/(\d+)h\s*(\d+)m/);
                if (hm) {{ s = parseInt(hm[1])*3600 + parseInt(hm[2])*60; }}
                setUptimeSeconds(s);
            }}
        }}
      }})
      .catch(() => setStatsError(true));
  }};

  useEffect(() => {{
    loadStats();
    const t = setInterval(loadStats, 30000);
    return () => clearInterval(t);
  }}, []);

  // Live ticking uptime
  useEffect(() => {{
    const t = setInterval(() => {{
      setUptimeSeconds(s => s + 1);
    }}, 1000);
    return () => clearInterval(t);
  }}, []);

  const formatUptime = (secs) => {{
    if (!secs) return stats?.uptime || '—';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${{h}}h ${{m}}m ${{s}}s`;
  }};

  const handleLogout = () => {{
    sessionStorage.removeItem('dehati_admin_token');
    onLogout();
  }};

  const handleClearCache = async () => {{
    await adminFetch('/cache/flush', {{ method: 'POST' }});
    setShowClearModal(false);
    loadStats();
  }};

  const textPrimary = dark ? '#F1F5F9' : '#111827';
  const textSecondary = dark ? '#94A3B8' : '#6B7280';
  const cardBg = dark ? '#1E293B' : 'white';
  const borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <div className={{`admin-container ${{dark ? 'dark' : 'light'}}`}}>
      <GlobalStyles />
      
      {{showClearModal && (
        <ClearCacheModal 
          entries={{stats?.aiCache?.entries ?? 0}} 
          onConfirm={{handleClearCache}} 
          onCancel={{() => setShowClearModal(false)}} 
          dark={{dark}} 
        />
      )}}

      {{/* Top Header */}}
      <div className="glass-header" style={{{{
        padding: '0 1.5rem', display: 'flex', alignItems: 'center', height: 64,
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.05)'
      }}}}>
        <div style={{{{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}}}>
          <div style={{{{ width: 36, height: 36, background: '#10B981', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 2px 10px rgba(16,185,129,0.3)' }}}}>🌾</div>
          <div>
            <div style={{{{ fontWeight: 800, fontSize: '1rem', lineHeight: 1, color: textPrimary }}}}>DehatiAI Admin</div>
            <div style={{{{ fontSize: '0.7rem', color: textSecondary, fontWeight: 600 }}}}>Management Panel</div>
          </div>
        </div>
        
        <div style={{{{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}}}>
          {{/* Status indicators */}}
          <div style={{{{ display: 'flex', gap: '1rem', alignItems: 'center', background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', padding: '0.4rem 1rem', borderRadius: 9999 }}}}>
            <span style={{{{ fontSize: '0.75rem', fontWeight: 600, color: textSecondary }}}}>
              👥 Users: {{stats?.totalUsers || 0}}
            </span>
            <span style={{{{ fontSize: '0.75rem', fontWeight: 600, color: textSecondary }}}}>
              •
            </span>
            <span style={{{{ fontSize: '0.75rem', fontWeight: 600, color: textSecondary }}}}>
              ⏱️ Uptime: {{formatUptime(uptimeSeconds)}}
            </span>
            <span style={{{{ fontSize: '0.75rem', fontWeight: 600, color: textSecondary }}}}>
              •
            </span>
            <span style={{{{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}}}>
              <span style={{{{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'statusPulse 2s infinite' }}}}></span>
              Live
            </span>
          </div>

          <div style={{{{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}}}>
            <button style={{{{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '0.4rem', borderRadius: '50%' }}}}>🔔</button>
            <button onClick={{() => setDark(!dark)}} style={{{{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '0.4rem', borderRadius: '50%' }}}}>
              {{dark ? '☀️' : '🌙'}}
            </button>
            <button onClick={{handleLogout}} style={{{{
              marginLeft: '0.5rem', background: '#EF4444', color: 'white', borderRadius: 8, padding: '0.4rem 0.875rem',
              border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'background 0.2s'
            }}}}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {{/* Tab Bar */}}
      <div style={{{{ 
        padding: '1rem 1.5rem', display: 'flex', gap: '0.5rem', overflowX: 'auto',
        borderBottom: `1px solid ${{borderColor}}`,
        background: dark ? '#0F172A' : 'white'
      }}}}>
        {{TABS.map(t => (
          <button
            key={{t.id}}
            onClick={{() => setTab(t.id)}}
            className={{`pill-tab ${{tab === t.id ? 'active' : ''}}`}}
          >
            {{t.label}}
          </button>
        ))}}
      </div>

      {{/* Content */}}
      <div style={{{{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}}}>

        {{tab === 'dashboard' && (
          <div style={{{{ animation: 'cardIn 0.3s ease-out' }}}}>
            <h2 style={{{{ fontSize: '1.25rem', fontWeight: 800, color: textPrimary, marginBottom: '1.5rem' }}}}>Overview</h2>
            
            {{/* KPI Grid */}}
            <div style={{{{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}}}>
              <StatCard dark={{dark}} ring ringPct={{stats?.aiCache?.hitRate || 0}} icon="⚡" label="Cache Hit Rate" value={{`${{stats?.aiCache?.hitRate || 0}}%`}} sub={{`${{stats?.aiCache?.entries ?? 0}} entries`}} color="#10B981" />
              <StatCard dark={{dark}} icon="📅" label="New Users Today" value={{stats?.newToday}} sub="Last 24h" color="#3B82F6" />
              <StatCard dark={{dark}} icon="👤" label="Guest Users" value={{stats?.guestUsers}} sub="Trial Mode" color="#F59E0B" />
              <StatCard dark={{dark}} icon="👨‍🌾" label="Registered Users" value={{stats?.registeredUsers}} sub="Verified" color="#8B5CF6" />
              <StatCard dark={{dark}} icon="👥" label="Total Users" value={{stats?.totalUsers}} sub="Combined" color="#6366F1" />
              <StatCard dark={{dark}} icon="🔗" label="Environment" value={{stats?.nodeVersion || 'v20'}} sub={{stats?.environment || 'Production'}} color="#64748B" />
              <StatCard dark={{dark}} icon="⏱️" label="System Uptime" value={{formatUptime(uptimeSeconds)}} sub="Continuous" color="#EC4899" />
              <StatCard dark={{dark}} icon="💾" label="Cache Performance" value={{stats?.aiCache?.hits || 0}} sub={{`${{stats?.aiCache?.misses ?? 0}} misses`}} color="#14B8A6" />
            </div>

            <div style={{{{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}}}>
              
              {{/* Services Monitoring Panel */}}
              <div style={{{{ background: cardBg, borderRadius: 16, padding: '1.5rem', border: `1px solid ${{borderColor}}`, boxShadow: dark ? '0 4px 6px -1px rgba(0,0,0,0.2)' : '0 4px 6px -1px rgba(0,0,0,0.05)' }}}}>
                <h3 style={{{{ fontWeight: 700, fontSize: '1rem', color: textPrimary, marginBottom: '1.25rem' }}}}>🔧 Services Monitor</h3>
                <div style={{{{ display: 'flex', flexDirection: 'column', gap: '1rem' }}}}>
                  {{[
                    {{ name: 'Claude AI', icon: '🤖', ok: stats?.claudeConfigured }},
                    {{ name: 'PostgreSQL', icon: '🐘', ok: stats?.postgresConfigured }},
                    {{ name: 'Supabase', icon: '🗄️', ok: stats?.supabaseConfigured }},
                    {{ name: 'Persistent DB', icon: '💾', ok: stats?.persistentDB }},
                  ].map(s => (
                    <div key={{s.name}} style={{{{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: dark ? 'rgba(0,0,0,0.2)' : '#F8FAFC', borderRadius: 12 }}}}>
                      <div style={{{{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}}}>
                        <span style={{{{ fontSize: '1.25rem' }}}}>{{s.icon}}</span>
                        <span style={{{{ fontWeight: 600, fontSize: '0.9rem', color: textPrimary }}}}>{{s.name}}</span>
                      </div>
                      <HealthBadge dark={{dark}} status={{s.ok ? 'ok' : 'error'}} />
                    </div>
                  ))}}
                </div>
              </div>

              {{/* Quick Actions Panel */}}
              <div style={{{{ background: cardBg, borderRadius: 16, padding: '1.5rem', border: `1px solid ${{borderColor}}`, boxShadow: dark ? '0 4px 6px -1px rgba(0,0,0,0.2)' : '0 4px 6px -1px rgba(0,0,0,0.05)' }}}}>
                <h3 style={{{{ fontWeight: 700, fontSize: '1rem', color: textPrimary, marginBottom: '1.25rem' }}}}>🚀 Quick Actions</h3>
                <div style={{{{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}}}>
                  {{[
                    {{ label: 'View All Users',    action: () => setTab('users'),   color: '#10B981' }},
                    {{ label: 'User Questions',    action: () => setTab('chatlogs'),color: '#3B82F6' }},
                    {{ label: 'Edit Market Prices',action: () => setTab('prices'),  color: '#F59E0B' }},
                    {{ label: 'Check Health',      action: () => setTab('health'),  color: '#8B5CF6' }},
                    {{ label: 'Recent Activity',   action: () => setTab('recent'),  color: '#06B6D4' }},
                  ].map(a => (
                    <button key={{a.label}} onClick={{a.action}} style={{{{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem', borderRadius: 12, border: 'none', background: dark ? 'rgba(0,0,0,0.2)' : '#F8FAFC',
                      color: textPrimary, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                      borderLeft: `4px solid ${{a.color}}`, transition: 'all 0.2s',
                    }}}}
                    onMouseEnter={{e => e.currentTarget.style.transform = 'translateY(-2px)'}}
                    onMouseLeave={{e => e.currentTarget.style.transform = 'translateY(0)'}}
                    >
                      {{a.label}} <span style={{{{ color: a.color }}}}>→</span>
                    </button>
                  ))}}
                  
                  <button
                    onClick={{() => setShowClearModal(true)}}
                    style={{{{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem', borderRadius: 12, border: 'none', background: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
                      color: '#EF4444', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                      borderLeft: `4px solid #EF4444`, transition: 'all 0.2s',
                    }}}}
                    onMouseEnter={{e => e.currentTarget.style.transform = 'translateY(-2px)'}}
                    onMouseLeave={{e => e.currentTarget.style.transform = 'translateY(0)'}}
                  >
                    Clear AI Cache <span style={{{{ color: '#EF4444' }}}}>🗑️</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}}

        <div style={{{{ color: textPrimary }}}}>
          {{tab === 'users'         && <><h2 style={{{{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}}}>Users Management</h2><UsersTab /></>}}
          {{tab === 'chatlogs'      && <><h2 style={{{{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}}}>User Questions Log</h2><ChatLogsTab /></>}}
          {{tab === 'announcements' && <><h2 style={{{{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}}}>Announcements</h2><AnnouncementsTab /></>}}
          {{tab === 'schemes'       && <><h2 style={{{{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}}}>Government Schemes</h2><SchemesTab /></>}}
          {{tab === 'prices'        && <><h2 style={{{{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}}}>Market Prices Editor</h2><PricesTab /></>}}
          {{tab === 'health'        && <><h2 style={{{{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}}}>System Health</h2><HealthTab /></>}}
          {{tab === 'recent'        && <><h2 style={{{{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}}}>Recent Registrations</h2><RecentTab /></>}}
        </div>
      </div>
    </div>
  );
}}

{tabs_and_helpers}

{chat_logs}
'''

with open(r'c:\Dehati AI\frontend\src\pages\admin\AdminPanel.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("File rewritten successfully")
