import { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSend, FiX } from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubNewsPage.css';

const KPI = [
  { label: 'Published Articles', value: '124', delta: '+12 this month', up: true },
  { label: 'Drafts',            value: '18',  delta: '3 ready to publish', up: null },
  { label: 'Scheduled',         value: '7',   delta: 'next 7 days', up: null },
  { label: 'Total Audience',    value: '88K', delta: '+6.2%', up: true },
  { label: 'Subscribers',       value: '5',   delta: 'channels', up: null },
  { label: 'Total Reads',       value: '96K', delta: 'this month', up: true },
];

const TABS = ['All', 'Drafts', 'Scheduled', 'Announcements'];
const TYPES = ['Match Report', 'Preview', 'Announcement', 'Club News', 'Transfer'];

const CHANNELS = [
  { channel: 'Website',   pct: 88 },
  { channel: 'App',       pct: 74 },
  { channel: 'Email',     pct: 61 },
  { channel: 'Twitter/X', pct: 52 },
  { channel: 'Facebook',  pct: 44 },
];

type Status = 'published' | 'scheduled' | 'draft';
type Article = { title: string; type: string; date: string; author: string; reads: string; status: Status };

const INIT_ARTICLES: Article[] = [
  { title: 'KCCA FC Secure Big Win in League Thriller', type: 'Match Report', date: '10 May 2026', author: 'James Okello', reads: '12.4K', status: 'published' },
  { title: 'Training Preview: Preparing for SC Villa',  type: 'Preview',      date: '12 May 2026', author: 'Sarah Nambi',  reads: '3.1K',  status: 'published' },
  { title: 'Matchday Squad Announcement vs SC Villa',   type: 'Announcement', date: '18 May 2026', author: 'James Okello', reads: '—',     status: 'scheduled' },
  { title: 'New Membership Plans for Season 2026/27',   type: 'Club News',    date: '—',           author: 'Sarah Nambi',  reads: '—',     status: 'draft' },
  { title: 'Patrick Kaddu Signs Contract Extension',    type: 'Transfer',     date: '8 May 2026',  author: 'James Okello', reads: '9.8K',  status: 'published' },
  { title: 'CAF CC Round 2 Preview vs TP Mazembe',      type: 'Preview',      date: '—',           author: 'Mark Ssali',   reads: '—',     status: 'draft' },
];

const STATUS_CLASS: Record<string, string> = {
  published: 'ca-pill-green', scheduled: 'ca-pill-orange', draft: 'ca-pill-muted',
};

const BLANK: Article = { title: '', type: 'Match Report', date: '', author: '', reads: '—', status: 'draft' };

type ModalKind = null | 'create' | 'edit' | 'schedule';

export default function ClubNewsPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [articles, setArticles] = useState<Article[]>(INIT_ARTICLES);
  const [modal, setModal] = useState<ModalKind>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<Article>(BLANK);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const visible = articles.filter(a =>
    activeTab === 'All' ? true :
    activeTab === 'Drafts' ? a.status === 'draft' :
    activeTab === 'Scheduled' ? a.status === 'scheduled' :
    a.type === 'Announcement',
  );

  const openCreate = () => { setForm(BLANK); setEditIdx(null); setModal('create'); };
  const openEdit = (idx: number) => {
    setForm({ ...articles[idx] });
    setEditIdx(idx);
    setModal('edit');
  };

  const saveArticle = () => {
    if (!form.title.trim()) return;
    if (editIdx !== null) {
      setArticles(prev => prev.map((a, i) => i === editIdx ? form : a));
      showToast('Article updated');
    } else {
      setArticles(prev => [...prev, form]);
      showToast('Article created');
    }
    setModal(null);
  };

  const deleteArticle = (idx: number) => {
    setArticles(prev => prev.filter((_, i) => i !== idx));
    showToast('Article deleted');
  };

  const schedulePost = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    showToast('Post scheduled successfully');
    setModal(null);
  };

  const set = (k: keyof Article) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast">{toast}</div>}

      {/* Create / Edit modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">{modal === 'create' ? 'Create Article' : 'Edit Article'}</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              <div className="ca-form-grid">
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Title *</label>
                  <input className="ca-input" value={form.title} onChange={set('title')} placeholder="Article headline…" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Type</label>
                  <select className="ca-select" value={form.type} onChange={set('type')}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="ca-field">
                  <label className="ca-label">Status</label>
                  <select className="ca-select" value={form.status} onChange={set('status')}>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div className="ca-field">
                  <label className="ca-label">Author</label>
                  <input className="ca-input" value={form.author} onChange={set('author')} placeholder="Author name" />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Publish Date</label>
                  <input className="ca-input" type="date" value={form.date} onChange={set('date')} />
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={saveArticle}>
                {modal === 'create' ? 'Create Article' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Post modal */}
      {modal === 'schedule' && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">Schedule Post</h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <form onSubmit={schedulePost}>
              <div className="ca-modal-body">
                <div className="ca-form-grid">
                  <div className="ca-field ca-form-grid-full">
                    <label className="ca-label">Article</label>
                    <select className="ca-select">
                      {articles.filter(a => a.status === 'draft').map((a, i) => <option key={i}>{a.title}</option>)}
                    </select>
                  </div>
                  <div className="ca-field">
                    <label className="ca-label">Publish Date</label>
                    <input className="ca-input" type="date" required />
                  </div>
                  <div className="ca-field">
                    <label className="ca-label">Publish Time</label>
                    <input className="ca-input" type="time" defaultValue="09:00" />
                  </div>
                  <div className="ca-field ca-form-grid-full">
                    <label className="ca-label">Channels</label>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                      {['Website', 'App', 'Email', 'Twitter/X', 'Facebook'].map(c => (
                        <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                          <input type="checkbox" defaultChecked style={{ accentColor: 'var(--color-primary-light)' }} /> {c}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="ca-modal-footer">
                <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="ca-btn ca-btn-primary"><FiSend /> Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="ca-page-header">
        <div>
          <p className="ca-page-eyebrow">CA-04</p>
          <h1 className="ca-page-title">News &amp; Communications</h1>
          <p className="ca-page-subtitle">Create, manage and distribute club news, announcements and media content.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal('schedule')}><FiSend /> Schedule Post</button>
          <button type="button" className="ca-btn ca-btn-primary" onClick={openCreate}><FiPlus /> Create Article</button>
        </div>
      </div>

      <div className="ca-kpi-bar">
        {KPI.map(k => (
          <div key={k.label} className="ca-kpi-card">
            <p className="ca-kpi-label">{k.label}</p>
            <p className="ca-kpi-value">{k.value}</p>
            <span className={`ca-kpi-delta ${k.up === true ? 'up' : k.up === false ? 'down' : 'neutral'}`}>
              {k.up === true ? '↑ ' : ''}{k.delta}
            </span>
          </div>
        ))}
      </div>

      <div className="ca-tabs">
        {TABS.map(t => (
          <button key={t} type="button" className={`ca-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      <div className="ca-content-grid">
        <div className="ca-content-main">
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">Articles</h2>
              <span className="ca-panel-count">{visible.length} items</span>
            </div>
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr><th>Title</th><th>Type</th><th>Publish Date</th><th>Author</th><th>Reads</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '28px' }}>No articles in this category.</td></tr>
                  )}
                  {visible.map((a) => {
                    const idx = articles.indexOf(a);
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: 'var(--color-text-primary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</td>
                        <td><span className="ca-pill ca-pill-muted">{a.type}</span></td>
                        <td>{a.date || '—'}</td>
                        <td>{a.author || '—'}</td>
                        <td>{a.reads}</td>
                        <td><span className={`ca-pill ${STATUS_CLASS[a.status]}`}>{a.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="ca-icon-btn" title="Edit" onClick={() => openEdit(idx)}><FiEdit2 /></button>
                            <button type="button" className="ca-icon-btn" title="Delete" onClick={() => deleteArticle(idx)} style={{ color: '#ef4444' }}><FiTrash2 /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="ca-content-aside">
          <div className="ca-panel ca-featured-story">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Featured Story</h2></div>
            <div className="ca-featured-img-box">
              <div className="ca-featured-img-placeholder" />
              <div className="ca-featured-overlay">
                <span className="ca-pill ca-pill-orange" style={{ fontSize: '0.6rem' }}>Match Report</span>
                <p className="ca-featured-title">KCCA FC Secure Big Win in League Thriller</p>
              </div>
            </div>
            <p className="ca-featured-reads">12,400 reads · 10 May 2026</p>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Multi-Channel Reach</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CHANNELS.map(c => (
                <div key={c.channel} className="ca-channel-row">
                  <span className="ca-channel-label">{c.channel}</span>
                  <div className="ca-channel-bar-wrap"><div className="ca-channel-bar" style={{ width: `${c.pct}%` }} /></div>
                  <span className="ca-channel-pct">{c.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ClubAdminLayout>
  );
}
