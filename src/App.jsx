import React, { useState, useEffect, useCallback } from 'react';
import { sb } from './supabase';
import './App.css';

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ msg, onHide }) {
  useEffect(() => { if (msg) { const t = setTimeout(onHide, 2400); return () => clearTimeout(t); } }, [msg, onHide]);
  return <div className={`toast ${msg ? 'show' : ''}`}>{msg}</div>;
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color + '22', color }}><i className={`ti ti-${icon}`} /></div>
      <div>
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────
function Toggle({ on, onChange }) {
  return (
    <button className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-label="toggle">
      <span className="thumb" />
    </button>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────
function Badge({ children, color = 'purple' }) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}

// ── Modal ──────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Dashboard Panel ────────────────────────────────────────────────────────
function Dashboard({ flows, leads, keywords, messages }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h1>Dashboard</h1>
        <Badge color="green"><i className="ti ti-brand-instagram" /> Live</Badge>
      </div>
      <div className="stats-grid">
        <StatCard label="Messaggi inviati" value={messages} icon="send" color="#7c6af7" sub="outbound DM" />
        <StatCard label="Lead raccolti" value={leads} icon="users" color="#4ade80" sub="da Instagram" />
        <StatCard label="Flow attivi" value={flows} icon="git-branch" color="#fbbf24" sub="automazioni" />
        <StatCard label="Keyword attive" value={keywords} icon="tag" color="#f472b6" sub="rispondono ai DM" />
      </div>
      <div className="section-title">Webhook</div>
      <div className="card">
        <div className="config-row">
          <span className="config-label">Callback URL</span>
          <code className="mono-pill">https://yywcqmowpsejlunzoyli.supabase.co/functions/v1/ig-webhook</code>
        </div>
        <div className="config-row">
          <span className="config-label">Verify Token</span>
          <code className="mono-pill">54861684-1a77-4a13-8718-f33af5a9ae66</code>
        </div>
        <div className="config-row">
          <span className="config-label">Account</span>
          <span style={{ color: '#4ade80' }}>@neuroplasticity_training ✓</span>
        </div>
      </div>
    </div>
  );
}

// ── Keywords Panel ─────────────────────────────────────────────────────────
function Keywords({ toast }) {
  const [keywords, setKeywords] = useState([]);
  const [flows, setFlows] = useState([]);
  const [kw, setKw] = useState('');
  const [reply, setReply] = useState('');
  const [flowId, setFlowId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [k, f] = await Promise.all([
      sb('ig_keywords?select=*&order=created_at.desc'),
      sb('ig_flows?select=id,name&is_active=eq.true'),
    ]);
    setKeywords(k); setFlows(f); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!kw || !reply) { toast('Inserisci keyword e risposta'); return; }
    await sb('ig_keywords', { method: 'POST', body: { keyword: kw.toLowerCase().trim(), reply_text: reply, flow_id: flowId || null, is_active: true } });
    setKw(''); setReply(''); setFlowId('');
    toast('Keyword aggiunta!'); load();
  };

  const toggle = async (id, val) => {
    await sb(`ig_keywords?id=eq.${id}`, { method: 'PATCH', body: { is_active: val } });
    load();
  };

  const del = async (id) => {
    await sb(`ig_keywords?id=eq.${id}`, { method: 'DELETE', prefer: '' });
    toast('Keyword eliminata'); load();
  };

  return (
    <div className="panel">
      <div className="panel-header"><h1>Parole chiave</h1></div>
      <div className="two-col">
        <div>
          <div className="section-title">Keyword attive ({keywords.length})</div>
          <div className="card list-card">
            {loading && <div className="empty">Caricamento...</div>}
            {!loading && !keywords.length && <div className="empty">Nessuna keyword ancora</div>}
            {keywords.map(k => (
              <div key={k.id} className="list-row">
                <div className="list-info">
                  <span className="kw-tag">{k.keyword}</span>
                  <span className="list-meta">{k.reply_text}</span>
                </div>
                <div className="list-actions">
                  <Badge color={k.trigger_count > 0 ? 'purple' : 'gray'}>{k.trigger_count} trigger</Badge>
                  <Toggle on={k.is_active} onChange={v => toggle(k.id, v)} />
                  <button className="icon-btn danger" onClick={() => del(k.id)}><i className="ti ti-trash" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="section-title">Aggiungi keyword</div>
          <div className="card form-card">
            <div className="form-group">
              <label>Parola chiave</label>
              <input value={kw} onChange={e => setKw(e.target.value)} placeholder="es. link, info, prezzo" />
            </div>
            <div className="form-group">
              <label>Risposta automatica DM</label>
              <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Ciao! Ecco le informazioni che cerchi..." />
            </div>
            <div className="form-group">
              <label>Flow collegato (opzionale)</label>
              <select value={flowId} onChange={e => setFlowId(e.target.value)}>
                <option value="">Nessun flow</option>
                {flows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={save}><i className="ti ti-plus" /> Aggiungi</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Flows Panel ────────────────────────────────────────────────────────────
function Flows({ toast }) {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('keyword');
  const [triggerValue, setTriggerValue] = useState('');
  const [firstMsg, setFirstMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const f = await sb('ig_flows?select=*&order=created_at.desc');
    setFlows(f); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name) { toast('Inserisci il nome'); return; }
    const steps = firstMsg ? [{ type: 'message', message: firstMsg }] : [];
    await sb('ig_flows', { method: 'POST', body: { name, trigger_type: triggerType, trigger_value: triggerValue || null, steps, is_active: true } });
    setModal(false); setName(''); setFirstMsg(''); setTriggerValue('');
    toast('Flow creato!'); load();
  };

  const toggle = async (id, val) => {
    await sb(`ig_flows?id=eq.${id}`, { method: 'PATCH', body: { is_active: val } });
    load();
  };

  const del = async (id) => {
    await sb(`ig_flows?id=eq.${id}`, { method: 'DELETE', prefer: '' });
    toast('Flow eliminato'); load();
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h1>Flow</h1>
        <button className="btn btn-primary" onClick={() => setModal(true)}><i className="ti ti-plus" /> Nuovo flow</button>
      </div>
      <div className="card list-card">
        {loading && <div className="empty">Caricamento...</div>}
        {!loading && !flows.length && <div className="empty">Nessun flow ancora. Creane uno!</div>}
        {flows.map(f => (
          <div key={f.id} className={`list-row flow-row ${selected === f.id ? 'selected' : ''}`} onClick={() => setSelected(selected === f.id ? null : f.id)}>
            <div className="flow-icon-wrap"><i className="ti ti-git-branch" /></div>
            <div className="list-info">
              <span className="list-name">{f.name}</span>
              <span className="list-meta">Trigger: {f.trigger_type}{f.trigger_value ? ` → "${f.trigger_value}"` : ''} · {(f.steps || []).length} step · avviato {f.stats?.triggered || 0}×</span>
            </div>
            <div className="list-actions">
              <Badge color={f.is_active ? 'green' : 'gray'}>{f.is_active ? 'Attivo' : 'Pausa'}</Badge>
              <Toggle on={f.is_active} onChange={v => toggle(f.id, v)} />
              <button className="icon-btn danger" onClick={e => { e.stopPropagation(); del(f.id); }}><i className="ti ti-trash" /></button>
            </div>
            {selected === f.id && (
              <div className="flow-steps">
                {(f.steps || []).length === 0 && <span style={{ color: 'var(--text3)' }}>Nessuno step</span>}
                {(f.steps || []).map((s, i) => (
                  <div key={i} className="step-pill">
                    <span className="step-num">{i + 1}</span>
                    {s.type === 'delay' ? <><i className="ti ti-clock" /> {s.delay_seconds}s di attesa</> : <><i className="ti ti-message" /> {s.message}</>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Crea nuovo flow">
        <div className="modal-body">
          <div className="form-group">
            <label>Nome del flow</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="es. Benvenuto nuovi follower" />
          </div>
          <div className="form-group">
            <label>Trigger</label>
            <select value={triggerType} onChange={e => setTriggerType(e.target.value)}>
              <option value="keyword">Parola chiave</option>
              <option value="new_follower">Nuovo follower</option>
              <option value="story_mention">Menzione storia</option>
              <option value="comment">Commento al post</option>
            </select>
          </div>
          {triggerType === 'keyword' && (
            <div className="form-group">
              <label>Parola chiave trigger</label>
              <input value={triggerValue} onChange={e => setTriggerValue(e.target.value)} placeholder="es. link" />
            </div>
          )}
          <div className="form-group">
            <label>Primo messaggio</label>
            <textarea value={firstMsg} onChange={e => setFirstMsg(e.target.value)} placeholder="Ciao! Grazie per averci scritto..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={() => setModal(false)}>Annulla</button>
          <button className="btn btn-primary" onClick={create}><i className="ti ti-check" /> Crea flow</button>
        </div>
      </Modal>
    </div>
  );
}

// ── Leads Panel ────────────────────────────────────────────────────────────
function Leads({ toast }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const l = await sb('ig_leads?select=*&order=created_at.desc');
      setLeads(l); setLoading(false);
    })();
  }, []);

  const exportCSV = () => {
    if (!leads.length) { toast('Nessun lead da esportare'); return; }
    const csv = ['ig_username,email,source,data', ...leads.map(l => `${l.ig_username || ''},${l.email || ''},${l.source || ''},${l.created_at}`)].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'ig_leads.csv'; a.click();
    toast('CSV scaricato!');
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h1>Lead <span className="count-badge">{leads.length}</span></h1>
        <button className="btn" onClick={exportCSV}><i className="ti ti-download" /> Esporta CSV</button>
      </div>
      <div className="card list-card">
        <div className="lead-header">
          <span>Utente</span><span>Email</span><span>Fonte</span><span>Data</span>
        </div>
        {loading && <div className="empty">Caricamento...</div>}
        {!loading && !leads.length && <div className="empty">Nessun lead ancora. Configura le keyword per raccoglierli!</div>}
        {leads.map(l => (
          <div key={l.id} className="lead-row">
            <div className="lead-name">
              <div className="avatar">{(l.ig_username || '?').slice(0, 2).toUpperCase()}</div>
              <span>@{l.ig_username || '—'}</span>
            </div>
            <span className="lead-email">{l.email || '—'}</span>
            <Badge color="purple">{l.source || '—'}</Badge>
            <span className="lead-date">{new Date(l.created_at).toLocaleDateString('it')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Config Panel ───────────────────────────────────────────────────────────
function Config({ toast }) {
  const copy = (text) => { navigator.clipboard.writeText(text); toast('Copiato!'); };

  return (
    <div className="panel">
      <div className="panel-header"><h1>Configurazione</h1></div>
      <div className="section-title">Credenziali attive</div>
      <div className="card">
        <div className="config-row">
          <span className="config-label">Account Instagram</span>
          <span style={{ color: 'var(--green)' }}>@neuroplasticity_training ✓</span>
        </div>
        <div className="config-row">
          <span className="config-label">Page ID</span>
          <code className="mono-pill">959429044971851</code>
        </div>
        <div className="config-row">
          <span className="config-label">App ID Meta</span>
          <code className="mono-pill">1314288600705533</code>
        </div>
        <div className="config-row">
          <span className="config-label">Database</span>
          <span style={{ color: 'var(--green)' }}>Supabase — eu-west-1 ✓</span>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 20 }}>Webhook Meta</div>
      <div className="card">
        <div className="config-row">
          <span className="config-label">Callback URL</span>
          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
            <code className="mono-pill flex1">https://yywcqmowpsejlunzoyli.supabase.co/functions/v1/ig-webhook</code>
            <button className="icon-btn" onClick={() => copy('https://yywcqmowpsejlunzoyli.supabase.co/functions/v1/ig-webhook')}><i className="ti ti-copy" /></button>
          </div>
        </div>
        <div className="config-row">
          <span className="config-label">Verify Token</span>
          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
            <code className="mono-pill flex1">54861684-1a77-4a13-8718-f33af5a9ae66</code>
            <button className="icon-btn" onClick={() => copy('54861684-1a77-4a13-8718-f33af5a9ae66')}><i className="ti ti-copy" /></button>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>Incolla questi valori in developers.facebook.com → My Manychat → Use cases → Instagram API → Configure webhooks</p>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [panel, setPanel] = useState('dashboard');
  const [toastMsg, setToastMsg] = useState('');
  const [stats, setStats] = useState({});

  const toast = useCallback((msg) => setToastMsg(msg), []);

  useEffect(() => {
    (async () => {
      try {
        const [flows, leads, kws, msgs] = await Promise.all([
          sb('ig_flows?select=id&is_active=eq.true'),
          sb('ig_leads?select=id'),
          sb('ig_keywords?select=id&is_active=eq.true'),
          sb('ig_messages?select=id&direction=eq.outbound'),
        ]);
        setStats({ flows: flows.length, leads: leads.length, keywords: kws.length, messages: msgs.length });
      } catch (e) { console.error(e); }
    })();
  }, []);

  const nav = [
    { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
    { id: 'flows', icon: 'git-branch', label: 'Flow' },
    { id: 'keywords', icon: 'tag', label: 'Parole chiave' },
    { id: 'leads', icon: 'users', label: 'Lead' },
    { id: 'config', icon: 'settings', label: 'Configurazione' },
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon"><i className="ti ti-brand-instagram" /></div>
          <div>
            <div className="logo-name">MyChat</div>
            <div className="logo-sub">Instagram DM</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {nav.map(n => (
            <button key={n.id} className={`nav-item ${panel === n.id ? 'active' : ''}`} onClick={() => setPanel(n.id)}>
              <i className={`ti ti-${n.icon}`} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="status-dot" />
          <span>@neuroplasticity_training</span>
        </div>
      </aside>
      <main className="main">
        {panel === 'dashboard' && <Dashboard flows={stats.flows} leads={stats.leads} keywords={stats.keywords} messages={stats.messages} />}
        {panel === 'flows' && <Flows toast={toast} />}
        {panel === 'keywords' && <Keywords toast={toast} />}
        {panel === 'leads' && <Leads toast={toast} />}
        {panel === 'config' && <Config toast={toast} />}
      </main>
      <Toast msg={toastMsg} onHide={() => setToastMsg('')} />
    </div>
  );
}
