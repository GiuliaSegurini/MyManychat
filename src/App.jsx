import React, { useState, useEffect, useCallback } from 'react';
import { sb } from './supabase';
import './App.css';

const IG_TOKEN = 'IGAAONH3T1zM9BZAGF3ZAnkxeDJVZAFBJZAXNFMUEwTmtJZAi0yN2xDYktERGNJRkRsck9zSS0wemFtTFl5bHdDWWt2ZAmRudkI2ZA2s1WC1XWGZASMHBSMjJvUmYxX2NsU2RWUDV2QXZA0VTVDX0JzOWY0a2xsZA0h6ZA3RTa3VTUVRoOTZAISQZDZD';
const IG_USER_ID = '26770455472615914';
const SUPABASE_URL_NEW = 'https://yczjxadbbfyluxswqjnn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljemp4YWRiYmZ5bHV4c3dxam5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTYwMDAsImV4cCI6MjA5NTgzMjAwMH0.hYP1o16qSIwIvmxGAka91owKtFPZ-1RzIE3nTP5Emv0';
const ANALYTICS_USER_ID = '2f643ddb-baf0-49b0-901b-891f5776ed73'; // riga "profiles" nel progetto analytics, usata da generate-viral-drafts e publish-draft

const sbNew = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL_NEW}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer !== undefined ? opts.prefer : 'return=representation',
      ...opts.headers,
    },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  const t = await res.text();
  return t ? JSON.parse(t) : [];
};

function Toast({ msg, onHide }) {
  useEffect(() => { if (msg) { const t = setTimeout(onHide, 2400); return () => clearTimeout(t); } }, [msg, onHide]);
  return <div className={`toast ${msg ? 'show' : ''}`}>{msg}</div>;
}
function Badge({ children, color = 'purple' }) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}
function Toggle({ on, onChange }) {
  return <button className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)}><span className="thumb" /></button>;
}
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><span className="modal-title">{title}</span><button className="modal-close" onClick={onClose}><i className="ti ti-x" /></button></div>
        {children}
      </div>
    </div>
  );
}

function Posts({ toast }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [analyzing, setAnalyzing] = useState({});
  const [analyses, setAnalyses] = useState({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://graph.instagram.com/v19.0/${IG_USER_ID}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=20&access_token=${IG_TOKEN}`);
        const data = await res.json();
        setPosts(data.data || []);
      } catch (e) { toast('Errore caricamento post'); }
      setLoading(false);
    })();
  }, [toast]);

  const analyzeVideo = async (post) => {
    if (analyzing[post.id]) return;
    setAnalyzing(a => ({ ...a, [post.id]: true }));
    toast('Analisi AI in corso...');

    try {
      const res = await fetch(`${SUPABASE_URL_NEW}/functions/v1/analyzewclaude2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post_id: post.id, thumbnail_url: post.thumbnail_url }),
      });

      const data = await res.json();

      if (data.success) {
        setAnalyses(a => ({ ...a, [post.id]: data.analysis }));
        toast('✅ Analisi completata!');
      } else {
        toast('Errore: ' + (data.error || 'sconosciuto'));
      }
    } catch (e) {
      console.error(e);
      toast('Errore: ' + e.message);
    }

    setAnalyzing(a => ({ ...a, [post.id]: false }));
  };

  return (
    <div className="panel">
      <div className="panel-header"><h1><i className="ti ti-photo" /> Post Instagram</h1><Badge color="green">@neuroplasticity_training</Badge></div>
      {loading && <div className="posts-grid">{[...Array(9)].map((_, i) => <div key={i} className="post-skeleton" />)}</div>}
      <div className="posts-grid">
        {posts.map(p => (
          <div key={p.id} className={`post-card ${selected === p.id ? 'selected' : ''}`} onClick={() => setSelected(selected === p.id ? null : p.id)}>
            <div className="post-img-wrap">
              {p.media_type === 'VIDEO' ? <video src={p.media_url} className="post-img" muted /> : <img src={p.media_url || p.thumbnail_url} alt="" className="post-img" />}
              {p.media_type === 'VIDEO' && <div className="post-type-badge"><i className="ti ti-player-play" /></div>}
              {p.media_type === 'CAROUSEL_ALBUM' && <div className="post-type-badge"><i className="ti ti-stack-2" /></div>}
              <div className="post-overlay"><span><i className="ti ti-heart" /> {p.like_count || 0}</span><span><i className="ti ti-message-circle" /> {p.comments_count || 0}</span></div>
            </div>
            {selected === p.id && (
              <div className="post-detail">
                <p className="post-caption">{p.caption || 'Nessuna caption'}</p>
                <div className="post-meta-row">
                  <span className="post-date">{new Date(p.timestamp).toLocaleDateString('it')}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a href={p.permalink} target="_blank" rel="noreferrer" className="btn btn-sm"><i className="ti ti-external-link" /> Apri</a>
                    {p.media_type === 'VIDEO' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={e => { e.stopPropagation(); analyzeVideo(p); }}
                        disabled={analyzing[p.id]}
                        style={{ opacity: analyzing[p.id] ? 0.6 : 1 }}
                      >
                        {analyzing[p.id]
                          ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Analisi...</>
                          : <><i className="ti ti-scan" /> Analizza</>}
                      </button>
                    )}
                  </div>
                </div>

                {analyses[p.id] && (
                  <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {analyses[p.id].summary && (
                      <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                        <span style={{ color: 'var(--accent2)', fontWeight: 600 }}>📝 </span>
                        {analyses[p.id].summary}
                      </div>
                    )}
                    {analyses[p.id].scenes?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)', width: '100%' }}>SCENE</span>
                        {analyses[p.id].scenes.map((s, i) => <span key={i} className="badge badge-purple">{s}</span>)}
                      </div>
                    )}
                    {analyses[p.id].objects?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)', width: '100%' }}>OGGETTI</span>
                        {[...new Set(analyses[p.id].objects.flatMap(o => o.tags))].map((tag, i) => (
                          <span key={i} className="badge badge-gray">{tag}</span>
                        ))}
                      </div>
                    )}
                    {analyses[p.id].colors?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>COLORI</span>
                        {analyses[p.id].colors.map((c, i) => <span key={i} className="badge badge-amber">{c}</span>)}
                      </div>
                    )}
                    {analyses[p.id].text_detected?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)', width: '100%' }}>TESTO NEL VIDEO</span>
                        {analyses[p.id].text_detected.map((t, i) => <span key={i} className="badge badge-green">{t}</span>)}
                      </div>
                    )}
                    {analyses[p.id].mood && (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>MOOD</span>
                        <span className="badge badge-pink">{analyses[p.id].mood}</span>
                        {analyses[p.id].content_type && <span className="badge badge-purple">{analyses[p.id].content_type}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ stats, posts }) {
  return (
    <div className="panel">
      <div className="panel-header"><h1>Dashboard</h1><Badge color="green"><i className="ti ti-circle-check" /> Live</Badge></div>
      <div className="stats-grid">
        {[['Messaggi','send','#7c6af7',stats.messages,'outbound DM'],['Lead','users','#4ade80',stats.leads,'da Instagram'],['Flow attivi','git-branch','#fbbf24',stats.flows,'automazioni'],['Keyword','tag','#f472b6',stats.keywords,'rispondono ai DM']].map(([label,icon,color,value,sub]) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{ background: color + '22', color }}><i className={`ti ti-${icon}`} /></div>
            <div><div className="stat-value">{value ?? '—'}</div><div className="stat-label">{label}</div><div className="stat-sub">{sub}</div></div>
          </div>
        ))}
      </div>
      <div className="two-col" style={{ gap: 16 }}>
        <div>
          <div className="section-title">Ultimi post</div>
          <div className="card">
            {!posts.length && <div className="empty">Caricamento post...</div>}
            {posts.slice(0, 4).map(p => (
              <div key={p.id} className="list-row">
                <img src={p.media_url || p.thumbnail_url} alt="" className="post-thumb" />
                <div className="list-info">
                  <span className="list-name">{(p.caption || 'Senza caption').slice(0, 50)}{(p.caption || '').length > 50 ? '…' : ''}</span>
                  <span className="list-meta"><i className="ti ti-heart" /> {p.like_count || 0} &nbsp;<i className="ti ti-message-circle" /> {p.comments_count || 0} &nbsp; {new Date(p.timestamp).toLocaleDateString('it')}</span>
                </div>
                <a href={p.permalink} target="_blank" rel="noreferrer" className="icon-btn"><i className="ti ti-external-link" /></a>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="section-title">Stato sistema</div>
          <div className="card">
            {[['Account','@neuroplasticity_training ✓'],['Webhook','ig-webhook ✓'],['Database','Supabase eu-west-1 ✓'],['AI Analysis','Claude Vision ✓']].map(([label, val]) => (
              <div key={label} className="config-row"><span className="config-label">{label}</span><span style={{ color: '#4ade80', fontSize: 13 }}>{val}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Keywords({ toast }) {
  const [keywords, setKeywords] = useState([]);
  const [flows, setFlows] = useState([]);
  const [kw, setKw] = useState(''); const [reply, setReply] = useState(''); const [flowId, setFlowId] = useState('');
  const load = useCallback(async () => { const [k, f] = await Promise.all([sb('ig_keywords?select=*&order=created_at.desc'), sb('ig_flows?select=id,name&is_active=eq.true')]); setKeywords(k); setFlows(f); }, []);
  useEffect(() => { load(); }, [load]);
  const save = async () => { if (!kw || !reply) { toast('Inserisci keyword e risposta'); return; } await sb('ig_keywords', { method: 'POST', body: { keyword: kw.toLowerCase().trim(), reply_text: reply, flow_id: flowId || null, is_active: true } }); setKw(''); setReply(''); setFlowId(''); toast('Keyword aggiunta!'); load(); };
  const toggle = async (id, val) => { await sb(`ig_keywords?id=eq.${id}`, { method: 'PATCH', body: { is_active: val } }); load(); };
  const del = async (id) => { if (!window.confirm('Eliminare?')) return; await sb(`ig_keywords?id=eq.${id}`, { method: 'DELETE', prefer: '' }); toast('Eliminata'); load(); };
  return (
    <div className="panel">
      <div className="panel-header"><h1><i className="ti ti-tag" /> Parole chiave</h1></div>
      <div className="two-col">
        <div>
          <div className="section-title">Keyword attive ({keywords.length})</div>
          <div className="card list-card">
            {!keywords.length && <div className="empty">Nessuna keyword ancora</div>}
            {keywords.map(k => (
              <div key={k.id} className="list-row">
                <span className="kw-tag">{k.keyword}</span>
                <div className="list-info"><span className="list-meta" style={{ marginLeft: 8 }}>{k.reply_text}</span></div>
                <div className="list-actions"><Badge color={k.trigger_count > 0 ? 'purple' : 'gray'}>{k.trigger_count} trigger</Badge><Toggle on={k.is_active} onChange={v => toggle(k.id, v)} /><button className="icon-btn danger" onClick={() => del(k.id)}><i className="ti ti-trash" /></button></div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="section-title">Aggiungi keyword</div>
          <div className="card form-card">
            <div className="form-group"><label>Parola chiave</label><input value={kw} onChange={e => setKw(e.target.value)} placeholder="es. link, info, prezzo" /></div>
            <div className="form-group"><label>Risposta automatica DM</label><textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Ciao! Ecco le informazioni..." /></div>
            <div className="form-group"><label>Flow collegato</label><select value={flowId} onChange={e => setFlowId(e.target.value)}><option value="">Nessun flow</option>{flows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
            <button className="btn btn-primary" onClick={save} style={{ width: '100%' }}><i className="ti ti-plus" /> Aggiungi</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Flows({ toast }) {
  const [flows, setFlows] = useState([]); const [modal, setModal] = useState(false); const [selected, setSelected] = useState(null);
  const [name, setName] = useState(''); const [triggerType, setTriggerType] = useState('keyword'); const [triggerValue, setTriggerValue] = useState(''); const [firstMsg, setFirstMsg] = useState('');
  const load = useCallback(async () => { const f = await sb('ig_flows?select=*&order=created_at.desc'); setFlows(f); }, []);
  useEffect(() => { load(); }, [load]);
  const create = async () => { if (!name) { toast('Inserisci il nome'); return; } const steps = firstMsg ? [{ type: 'message', message: firstMsg }] : []; await sb('ig_flows', { method: 'POST', body: { name, trigger_type: triggerType, trigger_value: triggerValue || null, steps, is_active: true } }); setModal(false); setName(''); setFirstMsg(''); setTriggerValue(''); toast('Flow creato!'); load(); };
  const toggle = async (id, val) => { await sb(`ig_flows?id=eq.${id}`, { method: 'PATCH', body: { is_active: val } }); load(); };
  const del = async (id) => { if (!window.confirm('Eliminare?')) return; await sb(`ig_flows?id=eq.${id}`, { method: 'DELETE', prefer: '' }); toast('Flow eliminato'); load(); };
  return (
    <div className="panel">
      <div className="panel-header"><h1><i className="ti ti-git-branch" /> Flow</h1><button className="btn btn-primary" onClick={() => setModal(true)}><i className="ti ti-plus" /> Nuovo flow</button></div>
      <div className="card list-card">
        {!flows.length && <div className="empty">Nessun flow ancora</div>}
        {flows.map(f => (
          <div key={f.id}>
            <div className="list-row flow-row" onClick={() => setSelected(selected === f.id ? null : f.id)}>
              <div className="flow-icon-wrap"><i className="ti ti-git-branch" /></div>
              <div className="list-info"><span className="list-name">{f.name}</span><span className="list-meta">Trigger: {f.trigger_type}{f.trigger_value ? ` → "${f.trigger_value}"` : ''} · {(f.steps || []).length} step · avviato {f.stats?.triggered || 0}×</span></div>
              <div className="list-actions"><Badge color={f.is_active ? 'green' : 'gray'}>{f.is_active ? 'Attivo' : 'Pausa'}</Badge><Toggle on={f.is_active} onChange={v => toggle(f.id, v)} /><button className="icon-btn danger" onClick={e => { e.stopPropagation(); del(f.id); }}><i className="ti ti-trash" /></button></div>
            </div>
            {selected === f.id && (
              <div className="flow-steps-wrap">
                {!(f.steps || []).length && <span style={{ color: 'var(--text3)', fontSize: 12 }}>Nessuno step</span>}
                {(f.steps || []).map((s, i) => <div key={i} className="step-pill"><span className="step-num">{i + 1}</span>{s.type === 'delay' ? <><i className="ti ti-clock" /> {s.delay_seconds}s</> : <><i className="ti ti-message" /> {s.message}</>}</div>)}
              </div>
            )}
          </div>
        ))}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Crea nuovo flow">
        <div className="modal-body">
          <div className="form-group"><label>Nome</label><input value={name} onChange={e => setName(e.target.value)} placeholder="es. Benvenuto follower" /></div>
          <div className="form-group"><label>Trigger</label><select value={triggerType} onChange={e => setTriggerType(e.target.value)}><option value="keyword">Parola chiave</option><option value="new_follower">Nuovo follower</option><option value="story_mention">Menzione storia</option><option value="comment">Commento</option></select></div>
          {triggerType === 'keyword' && <div className="form-group"><label>Parola chiave</label><input value={triggerValue} onChange={e => setTriggerValue(e.target.value)} placeholder="es. link" /></div>}
          <div className="form-group"><label>Primo messaggio</label><textarea value={firstMsg} onChange={e => setFirstMsg(e.target.value)} placeholder="Ciao! Grazie per averci scritto..." /></div>
        </div>
        <div className="modal-footer"><button className="btn" onClick={() => setModal(false)}>Annulla</button><button className="btn btn-primary" onClick={create}><i className="ti ti-check" /> Crea</button></div>
      </Modal>
    </div>
  );
}

function Leads({ toast }) {
  const [leads, setLeads] = useState([]);
  useEffect(() => { (async () => { const l = await sb('ig_leads?select=*&order=created_at.desc'); setLeads(l); })(); }, []);
  const exportCSV = () => { if (!leads.length) { toast('Nessun lead'); return; } const csv = ['ig_username,email,source,data', ...leads.map(l => `${l.ig_username || ''},${l.email || ''},${l.source || ''},${l.created_at}`)].join('\n'); const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = 'ig_leads.csv'; a.click(); toast('CSV scaricato!'); };
  return (
    <div className="panel">
      <div className="panel-header"><h1><i className="ti ti-users" /> Lead <span className="count-badge">{leads.length}</span></h1><button className="btn" onClick={exportCSV}><i className="ti ti-download" /> Esporta CSV</button></div>
      <div className="card list-card">
        <div className="lead-header"><span>Utente</span><span>Email</span><span>Fonte</span><span>Data</span></div>
        {!leads.length && <div className="empty">Nessun lead ancora</div>}
        {leads.map(l => <div key={l.id} className="lead-row"><div className="lead-name"><div className="avatar">{(l.ig_username || '?').slice(0, 2).toUpperCase()}</div><span>@{l.ig_username || '—'}</span></div><span className="lead-email">{l.email || '—'}</span><Badge color="purple">{l.source || '—'}</Badge><span className="lead-date">{new Date(l.created_at).toLocaleDateString('it')}</span></div>)}
      </div>
    </div>
  );
}

function Config({ toast }) {
  const copy = t => { navigator.clipboard.writeText(t); toast('Copiato!'); };
  return (
    <div className="panel">
      <div className="panel-header"><h1><i className="ti ti-settings" /> Configurazione</h1></div>
      <div className="section-title">Credenziali attive</div>
      <div className="card">
        {[['Account Instagram','@neuroplasticity_training ✓'],['Page ID','959429044971851'],['App ID Meta','1314288600705533'],['Database','Supabase eu-west-1 ✓'],['AI Vision','Claude Opus ✓']].map(([label, val]) => <div key={label} className="config-row"><span className="config-label">{label}</span><span style={{ color: '#4ade80', fontSize: 13 }}>{val}</span></div>)}
      </div>
      <div className="section-title" style={{ marginTop: 20 }}>Webhook Meta</div>
      <div className="card">
        {[['Callback URL','https://yywcqmowpsejlunzoyli.supabase.co/functions/v1/ig-webhook'],['Verify Token','54861684-1a77-4a13-8718-f33af5a9ae66']].map(([label, val]) => (
          <div key={label} className="config-row"><span className="config-label">{label}</span><code className="mono-pill" style={{ flex: 1, cursor: 'pointer' }} onClick={() => copy(val)}>{val}</code><button className="icon-btn" onClick={() => copy(val)}><i className="ti ti-copy" /></button></div>
        ))}
      </div>
    </div>
  );
}

function CommentRules({ toast }) {
  const [rules, setRules] = useState([]);
  const [posts, setPosts] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [replyDm, setReplyDm] = useState('');
  const [replyComment, setReplyComment] = useState('');
  const [postId, setPostId] = useState('');

  const load = useCallback(async () => {
    const r = await sb('ig_comment_rules?select=*&order=created_at.desc');
    setRules(r);
    try {
      const res = await fetch(`https://graph.instagram.com/v19.0/${IG_USER_ID}/media?fields=id,caption&limit=10&access_token=${IG_TOKEN}`);
      const data = await res.json();
      setPosts(data.data || []);
    } catch(e) {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!replyDm) { toast('Inserisci il messaggio DM'); return; }
    await sb('ig_comment_rules', { method: 'POST', body: { keyword: keyword.toLowerCase().trim() || null, reply_dm: replyDm, reply_comment: replyComment || null, post_id: postId || null, is_active: true } });
    setKeyword(''); setReplyDm(''); setReplyComment(''); setPostId('');
    toast('Regola aggiunta!'); load();
  };

  const toggle = async (id, val) => { await sb(`ig_comment_rules?id=eq.${id}`, { method: 'PATCH', body: { is_active: val } }); load(); };
  const del = async (id) => { if (!window.confirm('Eliminare?')) return; await sb(`ig_comment_rules?id=eq.${id}`, { method: 'DELETE', prefer: '' }); toast('Eliminata'); load(); };

  return (
    <div className="panel">
      <div className="panel-header">
        <h1><i className="ti ti-message-forward" /> Auto-DM da commenti</h1>
        <span className="badge badge-green"><i className="ti ti-bolt" /> Attivo</span>
      </div>
      <div className="info-box">
        <i className="ti ti-info-circle" />
        <span>Quando qualcuno commenta un tuo post con una parola chiave, riceve automaticamente un DM privato.</span>
      </div>
      <div className="two-col">
        <div>
          <div className="section-title">Regole attive ({rules.length})</div>
          <div className="card list-card">
            {!rules.length && <div className="empty">Nessuna regola ancora</div>}
            {rules.map(r => (
              <div key={r.id} className="list-row">
                <div className="flow-icon-wrap" style={{ background: '#f472b622', color: '#f472b6' }}><i className="ti ti-message-forward" /></div>
                <div className="list-info">
                  <span className="list-name">{r.keyword ? `Keyword: "${r.keyword}"` : 'Qualsiasi commento'}</span>
                  <span className="list-meta">DM: {r.reply_dm} {r.post_id ? '· Post specifico' : '· Tutti i post'}</span>
                  <span className="list-meta" style={{color:'var(--accent2)'}}>{r.trigger_count} trigger</span>
                </div>
                <div className="list-actions">
                  <Toggle on={r.is_active} onChange={v => toggle(r.id, v)} />
                  <button className="icon-btn danger" onClick={() => del(r.id)}><i className="ti ti-trash" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="section-title">Nuova regola</div>
          <div className="card form-card">
            <div className="form-group">
              <label>Parola chiave nel commento (opzionale)</label>
              <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="es. link, info — vuoto = tutti i commenti" />
            </div>
            <div className="form-group">
              <label>Post specifico (opzionale)</label>
              <select value={postId} onChange={e => setPostId(e.target.value)}>
                <option value="">Tutti i post</option>
                {posts.map(p => <option key={p.id} value={p.id}>{(p.caption || 'Post senza caption').slice(0, 40)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Messaggio DM automatico</label>
              <textarea value={replyDm} onChange={e => setReplyDm(e.target.value)} placeholder="Ciao! Grazie per il commento, ecco il link che cercavi..." />
            </div>
            <div className="form-group">
              <label>Risposta pubblica al commento (opzionale)</label>
              <input value={replyComment} onChange={e => setReplyComment(e.target.value)} placeholder="es. Ti ho mandato un DM!" />
            </div>
            <button className="btn btn-primary" onClick={save} style={{ width: '100%' }}><i className="ti ti-plus" /> Aggiungi regola</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BozzeVirali({ toast }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [publishing, setPublishing] = useState({});
  const [edits, setEdits] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await sbNew(`editorial_posts?user_id=eq.${ANALYTICS_USER_ID}&generated_image_url=not.is.null&order=created_at.desc`);
      setDrafts(d);
    } catch (e) { toast('Errore caricamento bozze'); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const STEP_LABELS = {
    starting: 'Avvio...',
    fetching_media: 'Scarico i post da Instagram...',
    analyzing_insights: 'Analizzo le metriche',
    analyzing_video: 'Analizzo i Reel con Gemini',
    building_profile: 'Claude costruisce il profilo virale...',
    generating_plan: 'Claude scrive il piano editoriale...',
    done: 'Completato!',
    error: 'Errore',
  };

  const syncAnalytics = async () => {
    setSyncing(true);
    setSyncProgress(null);
    let polling = true;
    const poll = async () => {
      while (polling) {
        try {
          const rows = await sbNew(`sync_progress?user_id=eq.${ANALYTICS_USER_ID}&select=*`);
          if (rows?.[0]) setSyncProgress(rows[0]);
        } catch {}
        await new Promise(r => setTimeout(r, 1500));
      }
    };
    poll();
    try {
      const res = await fetch(`${SUPABASE_URL_NEW}/functions/v1/content-intelligence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: ANALYTICS_USER_ID }),
      });
      const data = await res.json();
      if (data.debug_insights_sample) window.alert(JSON.stringify(data.debug_insights_sample, null, 2));
      if (data.error) toast('Errore sync: ' + data.error);
      else toast(`✅ Analizzati ${data.videos_analyzed ?? 0} post. Ora puoi generare le bozze.`);
    } catch (e) { toast('Errore sync: ' + e.message); }
    polling = false;
    setSyncing(false);
    setSyncProgress(null);
  };


  const [lastError, setLastError] = useState(null);
  const [scheduleAt, setScheduleAt] = useState({});

  const saveEdits = async (id) => {
    const edit = edits[id];
    if (!edit) return;
    try {
      await sbNew(`editorial_posts?id=eq.${id}`, { method: 'PATCH', prefer: 'return=minimal', body: edit });
      toast('✅ Modifiche salvate');
      setEdits(e => { const n = { ...e }; delete n[id]; return n; });
      load();
    } catch (e) { toast('Errore: ' + e.message); }
  };

  const schedule = async (id) => {
    const when = scheduleAt[id];
    if (!when) { toast('Scegli prima data e ora'); return; }
    try {
      await sbNew(`editorial_posts?id=eq.${id}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: { status: 'scheduled', scheduled_for: new Date(when).toISOString() },
      });
      toast('📅 Programmata!');
      load();
    } catch (e) { toast('Errore: ' + e.message); }
  };

  const unschedule = async (id) => {
    try {
      await sbNew(`editorial_posts?id=eq.${id}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: { status: 'draft_ready', scheduled_for: null },
      });
      toast('Programmazione annullata');
      load();
    } catch (e) { toast('Errore: ' + e.message); }
  };

  const generate = async () => {
    setGenerating(true);
    toast('Generazione bozze in corso, può richiedere un minuto...');
    try {
      const res = await fetch(`${SUPABASE_URL_NEW}/functions/v1/generate-viral-drafts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: ANALYTICS_USER_ID }),
      });
      const data = await res.json();
      setLastError(JSON.stringify(data, null, 2));
      if (data.error) toast('Errore: ' + data.error);
      else toast(`✅ ${data.drafts_created || 0} nuove bozze generate!`);
    } catch (e) { setLastError('Errore di rete: ' + e.message); toast('Errore: ' + e.message); }
    setGenerating(false);
    load();
  };

  const publish = async (id) => {
    setPublishing(p => ({ ...p, [id]: true }));
    const edit = edits[id];
    try {
      if (edit) await sbNew(`editorial_posts?id=eq.${id}`, { method: 'PATCH', body: edit, prefer: 'return=minimal' });
      const res = await fetch(`${SUPABASE_URL_NEW}/functions/v1/publish-draft`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: id }),
      });
      const data = await res.json();
      if (data.error) toast('Errore pubblicazione: ' + data.error);
      else toast('✅ Pubblicato su Instagram!');
    } catch (e) { toast('Errore: ' + e.message); }
    setPublishing(p => ({ ...p, [id]: false }));
    load();
  };

  const discard = async (id) => {
    if (!window.confirm('Scartare questa bozza?')) return;
    try {
      await sbNew(`editorial_posts?id=eq.${id}`, { method: 'DELETE', prefer: '' });
      toast('Bozza scartata');
      setDrafts(d => d.filter(x => x.id !== id));
    } catch (e) { toast('Errore: ' + e.message); }
  };

  const setEdit = (id, field, value) => setEdits(e => ({ ...e, [id]: { ...e[id], [field]: value } }));
  const val = (d, field) => (edits[d.id]?.[field] !== undefined ? edits[d.id][field] : d[field]);

  const statusBadge = (status) => {
    const map = { draft_ready: ['Pronta', 'purple'], scheduled: ['Programmata', 'amber'], publishing: ['Pubblicazione...', 'amber'], published: ['Pubblicata', 'green'], failed: ['Errore', 'pink'] };
    const [label, color] = map[status] || [status, 'gray'];
    return <Badge color={color}>{label}</Badge>;
  };

  return (
    <div className="panel">
      <style>{`
        .draft-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
        .draft-card{background:var(--bg2);border:1px solid var(--border);border-radius:8px;overflow:hidden;display:flex;flex-direction:column}
        .draft-img-wrap{position:relative;padding-bottom:125%;overflow:hidden;background:var(--bg3)}
        .draft-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .draft-body{padding:14px;display:flex;flex-direction:column;gap:8px}
        .draft-topic{font-size:14px;font-weight:600;color:var(--text)}
        .draft-why{font-size:11px;color:var(--text3);font-style:italic}
        .draft-error{font-size:11px;color:var(--red)}
        .draft-score{font-size:11px;color:var(--text3)}
        .draft-row{display:flex;align-items:center;justify-content:space-between}
        .draft-actions{display:flex;gap:6px;margin-top:4px}
      `}</style>
      <div className="panel-header">
        <h1><i className="ti ti-sparkles" /> Bozze virali</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={syncAnalytics} disabled={syncing}>
            {syncing
              ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Sincronizzazione...</>
              : <><i className="ti ti-refresh" /> Aggiorna analytics da Instagram</>}
          </button>
          <button className="btn btn-primary" onClick={generate} disabled={generating}>
            {generating
              ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Generazione...</>
              : <><i className="ti ti-wand" /> Genera nuove bozze ora</>}
          </button>
        </div>
      </div>
      <div className="info-box">
        <i className="ti ti-info-circle" />
        <span>Prima volta? Premi "Aggiorna analytics da Instagram" (scarica i dati reali di reach/saves dai tuoi post), poi "Genera nuove bozze ora". Da qui in poi succede tutto in automatico ogni lunedì.</span>
      </div>
      {syncing && syncProgress && (
        <div className="info-box" style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'var(--accent2)' }}>
          <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite', color: 'var(--accent2)' }} />
          <span>
            {STEP_LABELS[syncProgress.step] || syncProgress.step}
            {syncProgress.total_items > 0 && ` (${syncProgress.current_item}/${syncProgress.total_items})`}
            {syncProgress.detail ? ` — ${syncProgress.detail}` : ''}
          </span>
        </div>
      )}
      {lastError && (
        <div className="info-box" style={{ background: 'rgba(248,113,113,0.12)', borderColor: 'var(--red)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
          <i className="ti ti-alert-triangle" style={{ color: 'var(--red)' }} />
          <span>{lastError}</span>
        </div>
      )}
      {loading && <div className="empty">Caricamento...</div>}
      {!loading && !drafts.length && <div className="empty">Nessuna bozza ancora. Premi "Genera nuove bozze ora" per crearne subito.</div>}
      <div className="draft-grid">
        {drafts.map(d => (
          <div key={d.id} className="draft-card">
            <div className="draft-img-wrap"><img src={d.generated_image_url} alt={d.topic} className="draft-img" /></div>
            <div className="draft-body">
              <div className="draft-row">
                {statusBadge(d.status)}
                {d.audience_growth_score != null && <span className="draft-score">score {Number(d.audience_growth_score).toFixed(2)}</span>}
              </div>
              <span className="draft-topic">{d.topic}</span>
              <div className="form-group">
                <label>Caption</label>
                <textarea value={val(d, 'caption_suggestion') || ''} onChange={e => setEdit(d.id, 'caption_suggestion', e.target.value)} disabled={d.status === 'published'} rows={4} />
              </div>
              <div className="form-group">
                <label>Call to action</label>
                <input value={val(d, 'cta_suggestion') || ''} onChange={e => setEdit(d.id, 'cta_suggestion', e.target.value)} disabled={d.status === 'published'} />
              </div>
              {d.why_suggested && <p className="draft-why">{d.why_suggested}</p>}
              {d.status === 'failed' && d.publish_error && <p className="draft-error">{d.publish_error}</p>}
              {d.status === 'scheduled' && d.scheduled_for && (
                <p className="draft-score">Programmata per: {new Date(d.scheduled_for).toLocaleString('it-IT')}</p>
              )}
              {(d.status === 'draft_ready' || d.status === 'failed') && (
                <div className="form-group">
                  <label>Programma per</label>
                  <input
                    type="datetime-local"
                    value={scheduleAt[d.id] || ''}
                    onChange={e => setScheduleAt(s => ({ ...s, [d.id]: e.target.value }))}
                  />
                </div>
              )}
              {d.status !== 'published' && d.status !== 'scheduled' && (
                <div className="draft-actions">
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => publish(d.id)} disabled={publishing[d.id] || d.status === 'publishing'}>
                    {publishing[d.id] || d.status === 'publishing' ? 'Pubblicazione...' : 'Pubblica ora'}
                  </button>
                  <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => schedule(d.id)}>Programma</button>
                  <button className="icon-btn danger" onClick={() => discard(d.id)}><i className="ti ti-trash" /></button>
                </div>
              )}
              {d.status === 'scheduled' && (
                <div className="draft-actions">
                  <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => saveEdits(d.id)} disabled={!edits[d.id]}>Salva modifiche</button>
                  <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => unschedule(d.id)}>Annulla programmazione</button>
                  <button className="icon-btn danger" onClick={() => discard(d.id)}><i className="ti ti-trash" /></button>
                </div>
              )}
              {d.status === 'published' && d.published_media_id && <span className="draft-score">media ID: {d.published_media_id}</span>}
              {(d.resource_pdf_url || d.stripe_payment_link) && (
                <div className="draft-row" style={{ marginTop: 6, gap: 10 }}>
                  {d.resource_pdf_url && <a href={d.resource_pdf_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent2)' }}>📄 Vedi PDF guida</a>}
                  {d.stripe_payment_link && <a href={d.stripe_payment_link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent2)' }}>💳 Link pagamento</a>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [panel, setPanel] = useState('dashboard');
  const [toastMsg, setToastMsg] = useState('');
  const [stats, setStats] = useState({});
  const [posts, setPosts] = useState([]);
  const toast = useCallback(msg => setToastMsg(msg), []);

  useEffect(() => {
    (async () => {
      try {
        const [flows, leads, kws, msgs] = await Promise.all([sb('ig_flows?select=id&is_active=eq.true'), sb('ig_leads?select=id'), sb('ig_keywords?select=id&is_active=eq.true'), sb('ig_messages?select=id&direction=eq.outbound')]);
        setStats({ flows: flows.length, leads: leads.length, keywords: kws.length, messages: msgs.length });
      } catch (e) { console.error(e); }
      try {
        const res = await fetch(`https://graph.instagram.com/v19.0/${IG_USER_ID}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=6&access_token=${IG_TOKEN}`);
        const data = await res.json();
        setPosts(data.data || []);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const nav = [
    { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
    { id: 'posts', icon: 'photo', label: 'Post' },
    { id: 'bozze', icon: 'sparkles', label: 'Bozze virali' },
    { id: 'flows', icon: 'git-branch', label: 'Flow' },
    { id: 'keywords', icon: 'tag', label: 'Parole chiave' },
    { id: 'leads', icon: 'users', label: 'Lead' },
    { id: 'comments', icon: 'message-forward', label: 'Auto-DM commenti' },
    { id: 'config', icon: 'settings', label: 'Configurazione' },
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon"><i className="ti ti-brand-instagram" /></div>
          <div><div className="logo-name">MyChat</div><div className="logo-sub">Instagram DM</div></div>
        </div>
        <nav className="sidebar-nav">
          {nav.map(n => <button key={n.id} className={`nav-item ${panel === n.id ? 'active' : ''}`} onClick={() => setPanel(n.id)}><i className={`ti ti-${n.icon}`} /><span>{n.label}</span></button>)}
        </nav>
        <div className="sidebar-footer"><div className="status-dot" /><span>@neuroplasticity_training</span></div>
      </aside>
      <main className="main">
        {panel === 'dashboard' && <Dashboard stats={stats} posts={posts} />}
        {panel === 'posts' && <Posts toast={toast} />}
        {panel === 'bozze' && <BozzeVirali toast={toast} />}
        {panel === 'flows' && <Flows toast={toast} />}
        {panel === 'keywords' && <Keywords toast={toast} />}
        {panel === 'leads' && <Leads toast={toast} />}
        {panel === 'comments' && <CommentRules toast={toast} />}
        {panel === 'config' && <Config toast={toast} />}
      </main>
      <Toast msg={toastMsg} onHide={() => setToastMsg('')} />
    </div>
  );
}
