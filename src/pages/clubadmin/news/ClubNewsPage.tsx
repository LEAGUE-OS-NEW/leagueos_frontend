import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSend, FiX, FiEye, FiImage, FiDownload, FiArchive, FiBell } from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import { useAuthStore } from '../../../store/authStore';
import { useClubWorkspaceStore } from '../../../store/clubWorkspaceStore';
import { DEMO_ENTITLEMENTS, CLUB_REGISTRY } from '../../../components/clubadmin/clubAdminData';
import { fetchClubSubmissions, submitClubStory } from '../../../services/newsAdminService';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubNewsPage.css';

const TABS = ['All', 'Published', 'Drafts', 'Scheduled', 'Archived', 'Media'];
const TYPES = ['Match Report', 'Preview', 'Announcement', 'Club News', 'Transfer'];

type Status = 'published' | 'pending' | 'rejected' | 'scheduled' | 'draft' | 'archived';
type Article = { id?: string; title: string; type: string; date: string; author: string; reads: string; status: Status; body: string; coverImage: string; rejectionReason?: string };

type MediaItem = { name: string; type: 'image' | 'video' | 'doc'; size: string; date: string; used: boolean };


const STATUS_CLASS: Record<string, string> = {
  published: 'ca-pill-green', pending: 'ca-pill-orange', rejected: 'ca-pill-red', scheduled: 'ca-pill-orange', draft: 'ca-pill-muted', archived: 'ca-pill-red',
};

const BLANK: Article = { title: '', type: 'Match Report', date: '', author: '', reads: '—', status: 'draft', body: '', coverImage: '' };

type ModalKind = null | 'create' | 'edit' | 'schedule' | 'preview';

const STAFF_ROLES = ['Club Admin', 'Communications', 'Content Creator'];

export default function ClubNewsPage() {
  const user = useAuthStore(s => s.user);
  const { selectedEntitlementId } = useClubWorkspaceStore();
  const rawEntitlements = user?.dashboard_access?.entitlements.filter(e => e.dashboard === 'CLUB_ADMIN') ?? [];
  const hasRealEntitlement = rawEntitlements.length > 0;
  const entitlements = hasRealEntitlement ? rawEntitlements : DEMO_ENTITLEMENTS;
  const currentEntitlement = entitlements.find(e => e.id === selectedEntitlementId) ?? entitlements[0] ?? null;
  const scopeId = currentEntitlement?.scope_id ?? 1;

  // AuthContextService.user_context() populates user.club from the real
  // active ClubWorkspace — prefer that over the demo registry whenever we
  // have a genuine (non-demo) entitlement (see ClubAdminSidebar.tsx).
  const realClub =
    hasRealEntitlement && user?.club && typeof user.club === 'object' && 'id' in user.club && 'name' in user.club
      ? (user.club as { id: string; name: string })
      : null;
  const clubName = realClub?.name ?? (CLUB_REGISTRY[scopeId] ?? { name: `Club #${scopeId}` }).name;

  const [activeTab, setActiveTab] = useState('All');
  const [articles, setArticles] = useState<Article[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [modal, setModal] = useState<ModalKind>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);
  const [form, setForm] = useState<Article>(BLANK);
  const [toast, setToast] = useState('');
  const [notifyFollowers, setNotifyFollowers] = useState(true);
  const [userRole] = useState('Communications');

  // Real submissions (any status) for this club — replaces the always-empty
  // local state the page previously started with on every load.
  useEffect(() => {
    if (!realClub) return;
    let cancelled = false;

    fetchClubSubmissions(realClub.id).then((submissions) => {
      if (cancelled) return;
      const mapped: Article[] = submissions.map((s) => ({
        id: s.id,
        title: s.title,
        type: 'Club News',
        date: s.submittedAt ? s.submittedAt.slice(0, 10) : '',
        author: s.author ?? s.submittedBy ?? clubName,
        reads: '—',
        status: s.status === 'approved' ? 'published' : s.status,
        body: s.body ?? s.description,
        coverImage: s.image ?? '',
        rejectionReason: s.rejectionReason,
      }));
      setArticles(mapped);
    }).catch(() => {
      // Real club has no reachable backend right now — leave the list empty
      // rather than showing stale/fabricated data.
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realClub?.id]);

  const canNotify = STAFF_ROLES.includes(userRole);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const visible = articles.filter(a =>
    activeTab === 'All'       ? a.status !== 'archived' :
    activeTab === 'Published' ? a.status === 'published' :
    activeTab === 'Drafts'    ? a.status === 'draft' :
    activeTab === 'Scheduled' ? a.status === 'scheduled' :
    activeTab === 'Archived'  ? a.status === 'archived' :
    false,
  );

  const openCreate = () => { setForm(BLANK); setEditIdx(null); setModal('create'); };
  const openEdit = (idx: number) => { setForm({ ...articles[idx] }); setEditIdx(idx); setModal('edit'); };
  const openPreview = (a: Article) => { setPreviewArticle(a); setModal('preview'); };

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

  const archiveArticle = (idx: number) => {
    setArticles(prev => prev.map((a, i) => i === idx ? { ...a, status: 'archived' } : a));
    showToast('Article archived');
  };

  const publishNow = (idx: number) => {
    const article = articles[idx];
    if (!article) return;

    if (!realClub) {
      showToast('Cannot submit — no club is linked to this account yet.');
      return;
    }

    submitClubStory(realClub.id, clubName, {
      title: article.title,
      description: article.body.slice(0, 200),
      body: article.body,
      image: article.coverImage,
      author: article.author,
      category: 'Clubs',
    }).then((submitted) => {
      showToast('Submitted for review by League OS staff');
      setArticles(prev => prev.map((a, i) => i === idx ? { ...a, id: submitted.id, status: 'pending' } : a));
    }).catch(() => {
      showToast('Could not submit — please try again.');
    });
  };

  const schedulePost = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const msg = notifyFollowers ? 'Post scheduled — followers will be notified' : 'Post scheduled';
    showToast(msg);
    setModal(null);
  };

  const set = (k: keyof Article) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCoverImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast('Image must be under 10 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({ ...f, coverImage: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const removeCoverImage = () => setForm(f => ({ ...f, coverImage: '' }));

  const MEDIA_ICON: Record<string, string> = { image: '🖼', video: '🎬', doc: '📄' };

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast">{toast}</div>}

      {/* Create / Edit modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal ca-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">{modal === 'create' ? 'Create Article' : 'Edit Article'}</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => { setPreviewArticle(form); setModal('preview'); }}>
                  <FiEye /> Preview
                </button>
                <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
              </div>
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
                    <option value="archived">Archived</option>
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
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Cover Image</label>
                  {form.coverImage ? (
                    <div className="ca-cover-preview">
                      <img src={form.coverImage} alt="Cover preview" className="ca-cover-preview-img" />
                      <button
                        type="button"
                        className="ca-cover-remove"
                        onClick={removeCoverImage}
                        aria-label="Remove cover image"
                      >
                        <FiX />
                      </button>
                    </div>
                  ) : (
                    <label className="ca-cover-upload">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        style={{ display: 'none' }}
                        onChange={handleCoverImage}
                      />
                      <FiImage className="ca-cover-upload-icon" />
                      <span className="ca-cover-upload-text">Click to upload cover image</span>
                      <span className="ca-cover-upload-hint">JPG, PNG, WebP — max 10 MB · Recommended 16:9</span>
                    </label>
                  )}
                </div>
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Article Body</label>
                  <textarea
                    className="ca-textarea"
                    rows={7}
                    value={form.body}
                    onChange={set('body')}
                    placeholder="Write the full article content here…"
                  />
                </div>
              </div>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => { setForm(f => ({ ...f, status: 'draft' })); saveArticle(); }}>
                Save as Draft
              </button>
              <button type="button" className="ca-btn ca-btn-primary" onClick={saveArticle}>
                {modal === 'create' ? 'Publish' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {modal === 'preview' && previewArticle && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal ca-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="ca-modal-header">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <h2 className="ca-modal-title">Article Preview</h2>
                <span className={`ca-pill ${STATUS_CLASS[previewArticle.status]}`} style={{ fontSize: '0.62rem' }}>{previewArticle.status}</span>
              </div>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              {previewArticle.coverImage ? (
                <img src={previewArticle.coverImage} alt="Cover" className="ca-preview-hero-img" />
              ) : (
                <div className="ca-preview-hero" />
              )}
              <div className="ca-preview-meta">
                <span className="ca-pill ca-pill-muted" style={{ fontSize: '0.62rem' }}>{previewArticle.type}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{previewArticle.date || 'Date TBC'}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>By {previewArticle.author || 'Unknown'}</span>
              </div>
              <h2 className="ca-preview-title">{previewArticle.title || 'Untitled Article'}</h2>
              <p className="ca-preview-body">{previewArticle.body || 'No content yet. Add body text in the editor.'}</p>
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>Close</button>
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
                  <div className="ca-field ca-form-grid-full">
                    <div className={`ca-notify-row ${!canNotify ? 'ca-notify-locked' : ''}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FiBell style={{ color: canNotify ? 'var(--color-primary-light)' : 'var(--color-text-muted)', flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: canNotify ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontWeight: 600 }}>
                            Notify followers
                          </p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            {canNotify ? 'Push notification to 88K subscribers' : 'Requires Communications role or above'}
                          </p>
                        </div>
                      </div>
                      <label className={`ca-toggle ${!canNotify ? 'ca-toggle-disabled' : ''}`}>
                        <input
                          type="checkbox"
                          checked={notifyFollowers && canNotify}
                          disabled={!canNotify}
                          onChange={e => setNotifyFollowers(e.target.checked)}
                        />
                        <span className="ca-toggle-slider" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Publishing queue */}
                <div style={{ marginTop: 4 }}>
                  <p className="ca-label" style={{ marginBottom: 8 }}>Publishing Queue</p>
                  <div className="ca-queue-list">
                    {articles.filter(a => a.status === 'scheduled').map((a, i) => (
                      <div key={i} className="ca-queue-item">
                        <span className="ca-queue-dot" />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-primary)', fontWeight: 600, lineHeight: 1.3 }}>{a.title}</p>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{a.date || 'Date TBC'} · {a.author}</p>
                        </div>
                        <span className="ca-pill ca-pill-orange" style={{ fontSize: '0.6rem' }}>Queued</span>
                      </div>
                    ))}
                    {articles.filter(a => a.status === 'scheduled').length === 0 && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>No posts currently queued.</p>
                    )}
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

          <h1 className="ca-page-title">News &amp; Communications</h1>
          <p className="ca-page-subtitle">Create, manage and distribute club news, announcements and media content.</p>
        </div>
        <div className="ca-page-actions">
          <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal('schedule')}><FiSend /> Schedule Post</button>
          <button type="button" className="ca-btn ca-btn-primary" onClick={openCreate}><FiPlus /> Create Article</button>
        </div>
      </div>

      <div className="ca-tabs">
        {TABS.map(t => (
          <button key={t} type="button" className={`ca-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── Media Library tab ── */}
      {activeTab === 'Media' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Media Library</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="ca-panel-count">{media.length} files</span>
                  <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm"><FiDownload /> Export</button>
                  <button type="button" className="ca-btn ca-btn-primary ca-btn-sm" onClick={() => showToast('Upload dialog opened')}><FiPlus /> Upload</button>
                </div>
              </div>
              <div className="ca-media-grid">
                {media.length === 0 && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, gridColumn: '1/-1' }}>No media files yet. Upload images, videos or documents to get started.</p>
                )}
                {media.map((m, i) => (
                  <div key={i} className="ca-media-card">
                    <div className="ca-media-thumb">
                      <span style={{ fontSize: '2rem' }}>{MEDIA_ICON[m.type]}</span>
                    </div>
                    <div className="ca-media-info">
                      <p className="ca-media-name" title={m.name}>{m.name}</p>
                      <p className="ca-media-meta">{m.size} · {m.date}</p>
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <span className={`ca-pill ${m.used ? 'ca-pill-green' : 'ca-pill-muted'}`} style={{ fontSize: '0.6rem' }}>{m.used ? 'In use' : 'Unused'}</span>
                        <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" onClick={() => showToast(`Copied link for ${m.name}`)}>Copy link</button>
                        {!m.used && (
                          <button type="button" className="ca-btn ca-btn-secondary ca-btn-sm" style={{ color: '#ef4444' }}
                            onClick={() => { setMedia(prev => prev.filter((_, j) => j !== i)); showToast('File deleted'); }}>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Storage</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[{ label: 'Images', used: 0 }, { label: 'Videos', used: 0 }, { label: 'Documents', used: 0 }].map(s => (
                  <div key={s.label} className="ca-channel-row">
                    <span className="ca-channel-label"><FiImage style={{ marginRight: 4 }} />{s.label}</span>
                    <div className="ca-channel-bar-wrap"><div className="ca-channel-bar" style={{ width: `${s.used}%` }} /></div>
                    <span className="ca-channel-pct">{s.used}%</span>
                  </div>
                ))}
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>0 GB of 10 GB used</p>
              </div>
            </div>
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Upload Guidelines</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['Images: JPG, PNG, WebP — max 10 MB', 'Videos: MP4, MOV — max 500 MB', 'Docs: PDF, DOCX — max 20 MB', 'Recommended image ratio: 16:9'].map((g, i) => (
                  <p key={i} style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>· {g}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Article list tabs ── */}
      {activeTab !== 'Media' && (
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
                              <button type="button" className="ca-icon-btn" title="Preview" onClick={() => openPreview(a)}><FiEye /></button>
                              <button type="button" className="ca-icon-btn" title="Edit" onClick={() => openEdit(idx)}><FiEdit2 /></button>
                              {a.status === 'draft' && (
                                <button type="button" className="ca-icon-btn" title="Publish" style={{ color: '#22c55e' }} onClick={() => publishNow(idx)}>
                                  <FiSend />
                                </button>
                              )}
                              {a.status !== 'archived' && (
                                <button type="button" className="ca-icon-btn" title="Archive" onClick={() => archiveArticle(idx)}><FiArchive /></button>
                              )}
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
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Multi-Channel Reach</h2></div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>No channel data yet.</p>
            </div>

            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Publishing Queue</h2>
                <span className="ca-panel-count">{articles.filter(a => a.status === 'scheduled').length} queued</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {articles.filter(a => a.status === 'scheduled').map((a, i) => (
                  <div key={i} className="ca-queue-item">
                    <span className="ca-queue-dot" />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-primary)', fontWeight: 600, lineHeight: 1.3 }}>{a.title}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{a.date || 'Date TBC'} · {a.author}</p>
                    </div>
                  </div>
                ))}
                {articles.filter(a => a.status === 'scheduled').length === 0 && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>No posts queued.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ClubAdminLayout>
  );
}
