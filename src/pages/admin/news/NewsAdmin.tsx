import { useEffect, useState } from 'react';
import { FiCheckCircle, FiClock, FiEdit2, FiImage, FiSend, FiStar, FiTrendingUp, FiX } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  approveStory,
  composeStory,
  fetchApprovedStories,
  fetchNewsQueue,
  rejectStory,
  setFeatured,
  toggleTrending,
  updateStory,
  type AdminStory,
  type ComposeStoryPayload,
  type EditStoryPayload,
} from '../../../services/newsAdminService';
import { extractApiError } from '../../../services/apiUtils';
import type { Story } from '../../../services/newsService';
import './NewsAdmin.css';

const CATEGORIES: Story['category'][] = ['Football', 'Rugby', 'Basketball', 'Clubs', 'Markets', 'Fantasy'];

const BLANK_COMPOSE: ComposeStoryPayload = {
  title: '',
  description: '',
  body: '',
  image: '',
  category: 'Football',
};

function formatSubmittedAt(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

type RejectState = { id: string; reason: string } | null;

function NewsAdmin() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [queue, setQueue] = useState<AdminStory[]>([]);
  const [published, setPublished] = useState<AdminStory[]>([]);
  const [selected, setSelected] = useState<AdminStory | null>(null);
  const [rejecting, setRejecting] = useState<RejectState>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSavingAction, setIsSavingAction] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditStoryPayload | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [compose, setCompose] = useState<ComposeStoryPayload>(BLANK_COMPOSE);
  const [isPublishing, setIsPublishing] = useState(false);
  const [composeMessage, setComposeMessage] = useState('');

  // Pure fetch — no setState inside, matches react-hooks/set-state-in-effect
  // convention already used elsewhere in this admin shell (SportsDataAdmin.tsx).
  const fetchAll = () => Promise.all([fetchNewsQueue(), fetchApprovedStories()]);

  useEffect(() => {
    let cancelled = false;

    fetchAll()
      .then(([queueResult, publishedResult]) => {
        if (cancelled) return;
        setQueue(queueResult);
        setPublished(publishedResult);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load news. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);
    fetchAll()
      .then(([queueResult, publishedResult]) => {
        setQueue(queueResult);
        setPublished(publishedResult);
      })
      .catch(() => setLoadError('Could not load news. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  const refreshLists = () => {
    fetchAll().then(([queueResult, publishedResult]) => {
      setQueue(queueResult);
      setPublished(publishedResult);
    });
  };

  const openStory = (story: AdminStory) => {
    setSelected(story);
    setIsEditing(false);
    setEditForm(null);
    setActionError(null);
  };

  const closeDrawer = () => {
    setSelected(null);
    setIsEditing(false);
    setEditForm(null);
  };

  const startEditing = () => {
    if (!selected) return;
    setEditForm({
      title: selected.title,
      description: selected.description,
      body: selected.body ?? selected.description,
      image: selected.image,
      author: selected.author,
      avatar: selected.avatar,
      category: selected.category,
    });
    setIsEditing(true);
    setActionError(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!selected || !editForm) return;
    if (!editForm.title.trim() || !editForm.description.trim()) {
      setActionError('Title and brief description are required.');
      return;
    }
    setIsSavingEdit(true);
    setActionError(null);
    try {
      const updated = await updateStory(selected.id, editForm);
      setSelected(updated);
      setIsEditing(false);
      setEditForm(null);
      refreshLists();
    } catch (err) {
      setActionError(extractApiError(err).message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleApprove = async (story: AdminStory, options?: { isFeatured?: boolean; isTrending?: boolean }) => {
    setActionError(null);
    setIsSavingAction(true);
    try {
      await approveStory(story.id, options);
      closeDrawer();
      refreshLists();
    } catch (err) {
      setActionError(extractApiError(err).message);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejecting || rejecting.reason.trim().length === 0) return;
    setActionError(null);
    setIsSavingAction(true);
    try {
      await rejectStory(rejecting.id, rejecting.reason.trim());
      setRejecting(null);
      closeDrawer();
      refreshLists();
    } catch (err) {
      setActionError(extractApiError(err).message);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleSetFeatured = async (id: string) => {
    try {
      await setFeatured(id);
      refreshLists();
    } catch (err) {
      setActionError(extractApiError(err).message);
    }
  };

  const handleToggleTrending = async (story: AdminStory) => {
    const result = await toggleTrending(story.id, !story.isTrending);
    if (!result.ok) {
      setActionError(result.reason ?? 'Could not update trending.');
      return;
    }
    setActionError(null);
    refreshLists();
  };

  const handleCoverImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setComposeMessage('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setComposeMessage('Image must be under 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event_) => setCompose((current) => ({ ...current, image: event_.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const handleEditCoverImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setActionError('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setActionError('Image must be under 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event_) =>
      setEditForm((current) => (current ? { ...current, image: event_.target?.result as string } : current));
    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (!compose.title.trim() || !compose.description.trim()) {
      setComposeMessage('Title and brief description are required.');
      return;
    }
    setIsPublishing(true);
    setComposeMessage('');
    try {
      await composeStory(compose);
      setCompose(BLANK_COMPOSE);
      setComposeMessage('Published.');
      refreshLists();
    } catch (err) {
      setComposeMessage(extractApiError(err).message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="na-content">
        <div className="na-header">
          <div>
            <p className="na-header__eyebrow">Sports Data &amp; Statistics</p>
            <h1>News</h1>
            <p>Review club-submitted stories, curate Top Story &amp; Trending, and publish original news.</p>
          </div>
        </div>

        {loadError ? (
          <div className="na-error-banner">
            {loadError}
            <button type="button" className="na-btn na-btn--ghost" onClick={handleRetry}>
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="na-loading">Loading news…</div>
        ) : (
          <>
            {actionError && <div className="na-error-banner">{actionError}</div>}

            {/* ── Review Queue ── */}
            <section className="na-panel">
              <div className="na-panel__header">
                <h2>Review Queue</h2>
                <span className="na-panel__count">{queue.length} pending</span>
              </div>
              {queue.length === 0 ? (
                <p className="na-empty">No club submissions awaiting review.</p>
              ) : (
                <div className="na-queue-list">
                  {queue.map((story) => (
                    <button type="button" key={story.id} className="na-queue-item" onClick={() => openStory(story)}>
                      <img src={story.image} alt="" className="na-queue-item__image" />
                      <div className="na-queue-item__body">
                        <p className="na-queue-item__title">{story.title}</p>
                        <p className="na-queue-item__meta">
                          {story.submittedBy} · {story.category} · <FiClock aria-hidden="true" /> {formatSubmittedAt(story.submittedAt)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* ── Compose News ── */}
            <section className="na-panel">
              <div className="na-panel__header">
                <h2>Compose News</h2>
              </div>
              <div className="na-compose-grid">
                <label className="na-field na-field--full">
                  Title
                  <input
                    value={compose.title}
                    onChange={(event) => setCompose((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Story headline…"
                  />
                </label>
                <label className="na-field">
                  Category
                  <select
                    value={compose.category}
                    onChange={(event) => setCompose((current) => ({ ...current, category: event.target.value as Story['category'] }))}
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="na-field na-field--full">
                  Brief description
                  <textarea
                    rows={2}
                    value={compose.description}
                    onChange={(event) => setCompose((current) => ({ ...current, description: event.target.value }))}
                    placeholder="One or two sentences summarising the story…"
                  />
                </label>
                <label className="na-field na-field--full">
                  Full story
                  <textarea
                    rows={6}
                    value={compose.body}
                    onChange={(event) => setCompose((current) => ({ ...current, body: event.target.value }))}
                    placeholder="Write the full article…"
                  />
                </label>
                <div className="na-field na-field--full">
                  <span>Photo</span>
                  {compose.image ? (
                    <div className="na-cover-preview">
                      <img src={compose.image} alt="Cover preview" />
                      <button
                        type="button"
                        className="na-cover-remove"
                        aria-label="Remove photo"
                        onClick={() => setCompose((current) => ({ ...current, image: '' }))}
                      >
                        <FiX />
                      </button>
                    </div>
                  ) : (
                    <label className="na-cover-upload">
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleCoverImage} />
                      <FiImage />
                      <span>Click to upload a photo</span>
                    </label>
                  )}
                </div>
              </div>
              {composeMessage && <p className="na-compose-message">{composeMessage}</p>}
              <div className="na-panel__footer">
                <button type="button" className="na-btn na-btn--primary" disabled={isPublishing} onClick={() => void handlePublish()}>
                  <FiSend aria-hidden="true" /> {isPublishing ? 'Publishing…' : 'Publish'}
                </button>
              </div>
            </section>

            {/* ── Published Stories ── */}
            <section className="na-panel">
              <div className="na-panel__header">
                <h2>Published Stories</h2>
                <span className="na-panel__count">{published.length} live</span>
              </div>
              <div className="na-published-list">
                {published.map((story) => (
                  <div className="na-published-item" key={story.id}>
                    <img src={story.image} alt="" className="na-published-item__image" />
                    <div className="na-published-item__body">
                      <p className="na-published-item__title">{story.title}</p>
                      <p className="na-published-item__meta">
                        {story.category} · {story.source === 'club' ? story.submittedBy : 'Staff'}
                      </p>
                    </div>
                    <div className="na-published-item__actions">
                      <button
                        type="button"
                        className={`na-toggle-btn${story.isFeatured ? ' active' : ''}`}
                        onClick={() => void handleSetFeatured(story.id)}
                      >
                        <FiStar aria-hidden="true" /> Top Story
                      </button>
                      <button
                        type="button"
                        className={`na-toggle-btn${story.isTrending ? ' active' : ''}`}
                        onClick={() => void handleToggleTrending(story)}
                      >
                        <FiTrendingUp aria-hidden="true" /> Trending
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* ── Review detail drawer ── */}
      {selected && (
        <div className="na-drawer-overlay" onClick={closeDrawer}>
          <div className="na-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="na-drawer__header">
              <h2>{isEditing ? 'Edit Story' : selected.title}</h2>
              <button type="button" className="na-drawer__close" aria-label="Close" onClick={closeDrawer}>
                <FiX />
              </button>
            </div>
            <div className="na-drawer__body">
              {!isEditing && <img src={selected.image} alt="" className="na-drawer__image" />}
              <p className="na-drawer__meta">
                Submitted by <strong>{selected.submittedBy}</strong> · {selected.category} · {formatSubmittedAt(selected.submittedAt)}
              </p>

              {isEditing && editForm ? (
                <div className="na-compose-grid">
                  <label className="na-field na-field--full">
                    Title
                    <input
                      value={editForm.title}
                      onChange={(event) => setEditForm((current) => (current ? { ...current, title: event.target.value } : current))}
                    />
                  </label>
                  <label className="na-field">
                    Category
                    <select
                      value={editForm.category}
                      onChange={(event) =>
                        setEditForm((current) => (current ? { ...current, category: event.target.value as Story['category'] } : current))
                      }
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="na-field na-field--full">
                    <span>Photo</span>
                    {editForm.image ? (
                      <div className="na-cover-preview">
                        <img src={editForm.image} alt="Cover preview" />
                        <button
                          type="button"
                          className="na-cover-remove"
                          aria-label="Remove photo"
                          onClick={() => setEditForm((current) => (current ? { ...current, image: '' } : current))}
                        >
                          <FiX />
                        </button>
                      </div>
                    ) : (
                      <label className="na-cover-upload">
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleEditCoverImage} />
                        <FiImage />
                        <span>Click to upload a photo</span>
                      </label>
                    )}
                  </div>
                  <label className="na-field na-field--full">
                    Brief description
                    <textarea
                      rows={2}
                      value={editForm.description}
                      onChange={(event) =>
                        setEditForm((current) => (current ? { ...current, description: event.target.value } : current))
                      }
                    />
                  </label>
                  <label className="na-field na-field--full">
                    Full story
                    <textarea
                      rows={6}
                      value={editForm.body}
                      onChange={(event) => setEditForm((current) => (current ? { ...current, body: event.target.value } : current))}
                    />
                  </label>
                </div>
              ) : (
                <>
                  <p className="na-drawer__description">{selected.description}</p>
                  {selected.body && <p className="na-drawer__body-text">{selected.body}</p>}
                </>
              )}
            </div>
            <div className="na-drawer__footer">
              {isEditing ? (
                <>
                  <button type="button" className="na-btn na-btn--ghost" onClick={cancelEditing} disabled={isSavingEdit}>
                    Cancel
                  </button>
                  <button type="button" className="na-btn na-btn--primary" disabled={isSavingEdit} onClick={() => void handleSaveEdit()}>
                    {isSavingEdit ? 'Saving…' : 'Save changes'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="na-btn na-btn--danger"
                    disabled={isSavingAction}
                    onClick={() => setRejecting({ id: selected.id, reason: '' })}
                  >
                    Reject
                  </button>
                  <button type="button" className="na-btn na-btn--ghost" disabled={isSavingAction} onClick={startEditing}>
                    <FiEdit2 aria-hidden="true" /> Edit Story
                  </button>
                  <button
                    type="button"
                    className="na-btn na-btn--ghost"
                    disabled={isSavingAction}
                    onClick={() => void handleApprove(selected)}
                  >
                    <FiCheckCircle aria-hidden="true" /> Approve
                  </button>
                  <button
                    type="button"
                    className="na-btn na-btn--primary"
                    disabled={isSavingAction}
                    onClick={() => void handleApprove(selected, { isFeatured: true, isTrending: true })}
                  >
                    Approve as Top Story
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject confirm modal ── */}
      {rejecting && (
        <div className="na-modal-overlay" role="dialog" aria-modal="true" onClick={() => setRejecting(null)}>
          <div className="na-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Reject story</h3>
            <label className="na-field-label" htmlFor="na-reject-reason">
              Reason (required)
            </label>
            <textarea
              id="na-reject-reason"
              rows={3}
              value={rejecting.reason}
              onChange={(event) => setRejecting({ ...rejecting, reason: event.target.value })}
              placeholder="Explain why this story isn't being published…"
            />
            <div className="na-modal__footer">
              <button type="button" className="na-btn na-btn--ghost" onClick={() => setRejecting(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="na-btn na-btn--danger"
                disabled={rejecting.reason.trim().length === 0 || isSavingAction}
                onClick={() => void handleConfirmReject()}
              >
                Reject story
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default NewsAdmin;
