import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiPlus, FiDownload, FiX, FiEdit2, FiCheck,
  FiAlertCircle, FiClock, FiUsers, FiZap, FiRefreshCw,
} from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import { useClubWorkspaceStore } from '../../../store/clubWorkspaceStore';
import { useAuthStore } from '../../../store/authStore';
import { getPublicFixtures, type PublicFixtureApi } from '../../../services/publicDashboardService';
import {
  fetchMatchTicketTypesAdmin,
  createTicketType,
  updateTicketType,
  deleteTicketType,
  type AdminTicketType,
  type CreateTicketTypeInput,
} from '../../../services/ticketingAdminService';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubTicketsAdminPage.css';

const TABS = ['Ticket Types', 'Scanner'];

type ScanResult = { valid: boolean; message: string } | null;

interface TicketTypeForm {
  name: string;
  description: string;
  price: string;
  quantity_available: string;
  sale_start_at: string;
  sale_end_at: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
}

const BLANK_FORM: TicketTypeForm = {
  name: '',
  description: '',
  price: '',
  quantity_available: '500',
  sale_start_at: '',
  sale_end_at: '',
  status: 'ACTIVE',
};

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '')}"`).join(',')),
  ].join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: filename,
  });
  a.click();
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ClubTicketsAdminPage() {
  const [activeTab, setActiveTab] = useState('Ticket Types');

  // Auth / workspace
  const user = useAuthStore((s) => s.user);
  const { selectedEntitlementId } = useClubWorkspaceStore();
  const entitlements = user?.dashboard_access?.entitlements.filter(
    (e) => e.dashboard === 'CLUB_ADMIN' && e.scope_type === 'CLUB' && e.scope_id,
  ) ?? [];
  const current = entitlements.find((e) => e.id === selectedEntitlementId) ?? entitlements[0] ?? null;
  const clubName = current?.scope_id ? String(current.scope_id) : 'Your Club';

  // Fixtures
  const [fixtures, setFixtures] = useState<PublicFixtureApi[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

  // Ticket types for the selected match
  const [ticketTypes, setTicketTypes] = useState<AdminTicketType[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typesError, setTypesError] = useState('');

  // Modal
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editTypeId, setEditTypeId] = useState<number | null>(null);
  const [form, setForm] = useState<TicketTypeForm>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Toast
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Scanner
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [checkIns, setCheckIns] = useState<{ code: string; time: string; valid: boolean }[]>([]);
  const scanRef = useRef<HTMLInputElement>(null);

  // Load real fixtures
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getPublicFixtures();
        if (!cancelled) {
          setFixtures(rows);
          if (rows.length > 0) setSelectedMatchId(rows[0].id);
        }
      } catch {
        if (!cancelled) setFixtures([]);
      } finally {
        if (!cancelled) setFixturesLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  // Load ticket types when match changes
  const loadTicketTypes = useCallback(async (matchId: number) => {
    setTypesLoading(true);
    setTypesError('');
    try {
      const types = await fetchMatchTicketTypesAdmin(matchId);
      setTicketTypes(types);
      setTypesError('');
    } catch (err) {
      setTypesError(err instanceof Error ? err.message : 'Could not load ticket types.');
      setTicketTypes([]);
    } finally {
      setTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMatchId === null) return;
    const run = async () => { await loadTicketTypes(selectedMatchId); };
    void run();
  }, [selectedMatchId, loadTicketTypes]);

  const selectedFixture = fixtures.find((f) => f.id === selectedMatchId) ?? null;

  // Open create modal
  const openCreate = () => {
    setForm(BLANK_FORM);
    setEditTypeId(null);
    setSaveError('');
    setModal('create');
  };

  // Open edit modal
  const openEdit = (t: AdminTicketType) => {
    setForm({
      name: t.name,
      description: t.description,
      price: String(t.price),
      quantity_available: String(t.quantityAvailable),
      sale_start_at: t.saleStartAt ?? '',
      sale_end_at: t.saleEndAt ?? '',
      status: t.status,
    });
    setEditTypeId(t.id);
    setSaveError('');
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim() || !selectedMatchId) return;
    const price = Number(form.price.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(price) || price <= 0) { setSaveError('Enter a valid price.'); return; }
    const qty = Number(form.quantity_available);
    if (!Number.isFinite(qty) || qty < 1) { setSaveError('Enter a valid quantity.'); return; }

    setSaving(true);
    setSaveError('');
    try {
      const input: CreateTicketTypeInput = {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        quantity_available: qty,
        sale_start_at: form.sale_start_at || null,
        sale_end_at: form.sale_end_at || null,
        status: form.status,
      };

      if (modal === 'edit' && editTypeId !== null) {
        const updated = await updateTicketType(editTypeId, input);
        setTicketTypes((prev) => prev.map((t) => (t.id === editTypeId ? updated : t)));
        showToast(`"${updated.name}" updated`);
      } else {
        const created = await createTicketType(selectedMatchId, input);
        setTicketTypes((prev) => [...prev, created]);
        showToast(`"${created.name}" created — fans can now buy this ticket`);
      }
      setModal(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save ticket type.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (typeId: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteTicketType(typeId);
      setTicketTypes((prev) => prev.filter((t) => t.id !== typeId));
      showToast(`"${name}" deleted`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete ticket type.');
    }
  };

  // Scanner
  const handleScan = () => {
    const code = scanInput.trim().toUpperCase();
    if (!code) return;
    const already = checkIns.find((c) => c.code === code);
    if (already) {
      setScanResult({ valid: false, message: `Ticket ${code} already scanned at ${already.time}.` });
    } else if (code.startsWith('TK-') && code.length >= 8) {
      const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      setCheckIns((prev) => [{ code, time, valid: true }, ...prev]);
      setScanResult({ valid: true, message: `Valid ticket — admitted at ${time}` });
    } else {
      setScanResult({ valid: false, message: `Invalid code: ${code}` });
    }
    setScanInput('');
    setTimeout(() => setScanResult(null), 4000);
    scanRef.current?.focus();
  };

  const exportRows = ticketTypes.map((t) => ({
    name: t.name,
    price: `UGX ${t.price.toLocaleString()}`,
    sold: t.quantitySold,
    available: t.quantityAvailable,
    remaining: t.remaining,
    status: t.status,
  }));

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast"><FiCheck /> {toast}</div>}

      {/* ── Ticket type modal ── */}
      {modal && (
        <div className="ca-modal-overlay" onClick={() => setModal(null)}>
          <div className="ca-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ca-modal-header">
              <h2 className="ca-modal-title">
                {modal === 'edit' ? 'Edit Ticket Type' : 'Create Ticket Type'}
              </h2>
              <button type="button" className="ca-modal-close" onClick={() => setModal(null)}><FiX /></button>
            </div>
            <div className="ca-modal-body">
              {selectedFixture && (
                <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                  Match: <strong style={{ color: 'var(--color-text-primary)' }}>
                    {selectedFixture.home_club_name} vs {selectedFixture.away_club_name}
                  </strong>
                </p>
              )}
              <div className="ca-form-grid">
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Type Name *</label>
                  <input
                    className="ca-input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. VIP Lounge, Standard, East Stand"
                  />
                </div>
                <div className="ca-field ca-form-grid-full">
                  <label className="ca-label">Description</label>
                  <input
                    className="ca-input"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description of this ticket category"
                  />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Price (UGX) *</label>
                  <input
                    className="ca-input"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="e.g. 50000"
                    inputMode="numeric"
                  />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Quantity Available *</label>
                  <input
                    className="ca-input"
                    type="number"
                    min="1"
                    value={form.quantity_available}
                    onChange={(e) => setForm((f) => ({ ...f, quantity_available: e.target.value }))}
                  />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Sale Start</label>
                  <input
                    className="ca-input"
                    type="datetime-local"
                    value={form.sale_start_at}
                    onChange={(e) => setForm((f) => ({ ...f, sale_start_at: e.target.value }))}
                  />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Sale End</label>
                  <input
                    className="ca-input"
                    type="datetime-local"
                    value={form.sale_end_at}
                    onChange={(e) => setForm((f) => ({ ...f, sale_end_at: e.target.value }))}
                  />
                </div>
                <div className="ca-field">
                  <label className="ca-label">Status</label>
                  <select
                    className="ca-select"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TicketTypeForm['status'] }))}
                  >
                    <option value="ACTIVE">Active — visible to fans</option>
                    <option value="DRAFT">Draft — hidden from fans</option>
                    <option value="INACTIVE">Inactive — sale closed</option>
                  </select>
                </div>
              </div>
              {saveError && (
                <p style={{ margin: '12px 0 0', fontSize: '0.8rem', color: '#ef4444' }}>{saveError}</p>
              )}
            </div>
            <div className="ca-modal-footer">
              <button type="button" className="ca-btn ca-btn-secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="ca-btn ca-btn-primary"
                onClick={() => void handleSave()}
                disabled={saving || !form.name.trim() || !form.price.trim()}
              >
                {saving ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Create Ticket Type'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="ca-page-header">
        <div>
          <p className="ca-page-eyebrow">{clubName}</p>
          <h1 className="ca-page-title">Ticketing</h1>
          <p className="ca-page-subtitle">
            Create and manage ticket types for your matches. Fans can buy tickets directly from their dashboard.
          </p>
        </div>
        <div className="ca-page-actions">
          <button
            type="button"
            className="ca-btn ca-btn-secondary"
            disabled={ticketTypes.length === 0}
            onClick={() => exportCSV(exportRows as unknown as Record<string, unknown>[], 'ticket-types.csv')}
          >
            <FiDownload /> Export
          </button>
          {activeTab === 'Ticket Types' && (
            <button
              type="button"
              className="ca-btn ca-btn-primary"
              onClick={openCreate}
              disabled={selectedMatchId === null}
            >
              <FiPlus /> Add Ticket Type
            </button>
          )}
        </div>
      </div>

      {/* ── Match selector ── */}
      {activeTab === 'Ticket Types' && (
        <div className="ca-panel" style={{ marginBottom: 20 }}>
          <div className="ca-panel-header">
            <h2 className="ca-panel-title">Select Match</h2>
            {selectedMatchId !== null && (
              <button
                type="button"
                className="ca-btn ca-btn-secondary"
                style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                onClick={() => void loadTicketTypes(selectedMatchId)}
              >
                <FiRefreshCw /> Refresh
              </button>
            )}
          </div>
          {fixturesLoading ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Loading matches…</p>
          ) : fixtures.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              No scheduled matches found. Matches are created by the platform admin.
            </p>
          ) : (
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr><th>Match</th><th>Date</th><th>Competition</th><th>Venue</th><th></th></tr>
                </thead>
                <tbody>
                  {fixtures.map((f) => (
                    <tr
                      key={f.id}
                      className={selectedMatchId === f.id ? 'ca-row-selected' : 'ca-row-static'}
                      onClick={() => setSelectedMatchId(f.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {f.home_club_name} vs {f.away_club_name}
                      </td>
                      <td>{formatDate(f.match_date)}</td>
                      <td>{f.competition_name}</td>
                      <td>{f.venue || '—'}</td>
                      <td>
                        {selectedMatchId === f.id && (
                          <span className="ca-pill ca-pill-green" style={{ fontSize: '0.65rem' }}>Selected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="ca-tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className={`ca-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* ── TICKET TYPES TAB ── */}
      {activeTab === 'Ticket Types' && (
        <div className="ca-panel">
          <div className="ca-panel-header">
            <h2 className="ca-panel-title">
              {selectedFixture
                ? `${selectedFixture.home_club_name} vs ${selectedFixture.away_club_name}`
                : 'Ticket Types'}
            </h2>
            <span className="ca-panel-count">{ticketTypes.length} types</span>
          </div>

          {typesLoading ? (
            <div className="ca-empty-state">
              <FiRefreshCw className="ca-empty-icon" />
              <p className="ca-empty-title">Loading ticket types…</p>
            </div>
          ) : typesError ? (
            <div className="ca-empty-state">
              <FiAlertCircle className="ca-empty-icon" />
              <p className="ca-empty-title">Could not load ticket types</p>
              <p className="ca-empty-sub">{typesError}</p>
              {selectedMatchId !== null && (
                <button
                  type="button"
                  className="ca-btn ca-btn-secondary"
                  onClick={() => void loadTicketTypes(selectedMatchId)}
                >
                  Retry
                </button>
              )}
            </div>
          ) : ticketTypes.length === 0 ? (
            <div className="ca-empty-state">
              <FiZap className="ca-empty-icon" />
              <p className="ca-empty-title">No ticket types yet</p>
              <p className="ca-empty-sub">
                Add a ticket type to this match so fans can purchase tickets.
              </p>
              {selectedMatchId !== null && (
                <button type="button" className="ca-btn ca-btn-primary" onClick={openCreate}>
                  <FiPlus /> Add First Ticket Type
                </button>
              )}
            </div>
          ) : (
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Available</th>
                    <th>Sold</th>
                    <th>Remaining</th>
                    <th>Status</th>
                    <th>Sale Window</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ticketTypes.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{t.name}</td>
                      <td>UGX {t.price.toLocaleString('en-UG')}</td>
                      <td>{t.quantityAvailable.toLocaleString()}</td>
                      <td>{t.quantitySold.toLocaleString()}</td>
                      <td style={{ color: t.remaining < 20 ? '#ef4444' : 'inherit' }}>
                        {t.remaining.toLocaleString()}
                      </td>
                      <td>
                        <span className={`ca-pill ${t.status === 'ACTIVE' ? 'ca-pill-green' : t.status === 'DRAFT' ? 'ca-pill-orange' : 'ca-pill-muted'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {t.saleStartAt ? formatDate(t.saleStartAt) : '—'} → {t.saleEndAt ? formatDate(t.saleEndAt) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button type="button" className="ca-icon-btn" title="Edit" onClick={() => openEdit(t)}>
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="ca-icon-btn"
                            title="Delete"
                            style={{ color: '#ef4444' }}
                            onClick={() => void handleDelete(t.id, t.name)}
                          >
                            <FiX />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SCANNER TAB ── */}
      {activeTab === 'Scanner' && (
        <div className="ca-content-grid">
          <div className="ca-content-main">
            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Ticket Scanner</h2>
                <span className="ca-pill ca-pill-green" style={{ fontSize: '0.68rem' }}>
                  <FiZap style={{ fontSize: '0.7rem' }} /> Live
                </span>
              </div>
              <div className="ca-scanner-box">
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  Scan a QR code or enter a ticket code and press Enter
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    ref={scanRef}
                    className="ca-input ca-scanner-input"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                    placeholder="TK-XXXXXXXX"
                    autoFocus
                  />
                  <button type="button" className="ca-btn ca-btn-primary" onClick={handleScan}>
                    Scan
                  </button>
                </div>
                {scanResult && (
                  <div className={`ca-scan-result ${scanResult.valid ? 'ca-scan-valid' : 'ca-scan-invalid'}`}>
                    {scanResult.valid
                      ? <FiCheck style={{ fontSize: '1.1rem', color: '#22c55e', flexShrink: 0 }} />
                      : <FiAlertCircle style={{ fontSize: '1.1rem', color: '#ef4444', flexShrink: 0 }} />}
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: scanResult.valid ? '#22c55e' : '#ef4444', fontSize: '0.85rem' }}>
                        {scanResult.valid ? 'Valid Ticket' : 'Invalid Ticket'}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                        {scanResult.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="ca-scanner-stats">
                <div className="ca-scanner-stat">
                  <FiUsers style={{ color: '#22c55e', fontSize: '1.2rem' }} />
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                    {checkIns.filter((c) => c.valid).length}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Checked In</p>
                </div>
                <div className="ca-scanner-stat">
                  <FiClock style={{ color: '#f97316', fontSize: '1.2rem' }} />
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                    {checkIns.filter((c) => !c.valid).length}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Invalid</p>
                </div>
              </div>
            </div>

            <div className="ca-panel">
              <div className="ca-panel-header">
                <h2 className="ca-panel-title">Recent Scans</h2>
                <span className="ca-panel-count">{checkIns.length} scanned</span>
              </div>
              <div className="ca-table-wrap">
                <table className="ca-table">
                  <thead><tr><th>Code</th><th>Time</th><th>Result</th></tr></thead>
                  <tbody>
                    {checkIns.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>
                          No tickets scanned yet.
                        </td>
                      </tr>
                    )}
                    {checkIns.map((c, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary-light)', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                          {c.code}
                        </td>
                        <td>{c.time}</td>
                        <td>
                          {c.valid
                            ? <span className="ca-pill ca-pill-green" style={{ fontSize: '0.65rem' }}><FiCheck style={{ fontSize: '0.6rem' }} /> Valid</span>
                            : <span className="ca-pill ca-pill-red" style={{ fontSize: '0.65rem' }}><FiAlertCircle style={{ fontSize: '0.6rem' }} /> Invalid</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="ca-content-aside">
            <div className="ca-panel">
              <div className="ca-panel-header"><h2 className="ca-panel-title">Scanner Tips</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'Valid ticket codes start with TK-',
                  'Each ticket can only be scanned once',
                  'Press Enter to scan quickly',
                  'Invalid scans are logged for review',
                ].map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    <FiCheck style={{ color: 'var(--color-primary-light)', flexShrink: 0, marginTop: 2 }} />
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </ClubAdminLayout>
  );
}
