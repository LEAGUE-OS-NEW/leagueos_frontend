import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiActivity,
  FiCopy,
  FiPlus,
  FiSearch,
} from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  fetchMarketAdminStats,
  fetchMarkets,
  fetchProposals,
  markProposalDuplicate,
  rejectProposal,
  startProposalReview,
  type Market,
  type MarketProposal,
  type MarketStats,
  type MarketStatus,
  type ProposalStatus,
} from '../../../services/marketAdminService';
import { formatUgx } from '../../../utils/rules';
import './MarketsListPage.css';

type TabKey = 'Live' | 'Upcoming' | 'Draft' | 'Closed' | 'Resolved' | 'Cancelled' | 'Proposals';
const MARKET_TABS: { key: TabKey; statuses: MarketStatus[] }[] = [
  { key: 'Live', statuses: ['Live'] },
  { key: 'Upcoming', statuses: ['Upcoming'] },
  { key: 'Draft', statuses: ['Draft'] },
  { key: 'Closed', statuses: ['Closed'] },
  { key: 'Resolved', statuses: ['Resolved'] },
  { key: 'Cancelled', statuses: ['Cancelled', 'Voided', 'Suspended'] },
];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusPillClass(status: MarketStatus): string {
  switch (status) {
    case 'Live':
      return 'mkt-status-pill mkt-status-pill--live';
    case 'Upcoming':
      return 'mkt-status-pill mkt-status-pill--upcoming';
    case 'Draft':
      return 'mkt-status-pill mkt-status-pill--draft';
    case 'Resolved':
      return 'mkt-status-pill mkt-status-pill--resolved';
    case 'Suspended':
      return 'mkt-status-pill mkt-status-pill--suspended';
    default:
      return 'mkt-status-pill mkt-status-pill--cancelled';
  }
}

function proposalStatusPillClass(status: ProposalStatus): string {
  switch (status) {
    case 'New':
      return 'mkt-status-pill mkt-status-pill--upcoming';
    case 'Under Review':
      return 'mkt-status-pill mkt-status-pill--draft';
    case 'Converted':
      return 'mkt-status-pill mkt-status-pill--resolved';
    default:
      return 'mkt-status-pill mkt-status-pill--cancelled';
  }
}

function NoteModal({
  title,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  return (
    <div className="mkt-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="mkt-modal" onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        <label className="mkt-field-label" htmlFor="mkt-note">
          Note
        </label>
        <textarea id="mkt-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        <div className="mkt-modal__footer">
          <button type="button" className="mkt-btn mkt-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="mkt-btn mkt-btn--gradient"
            disabled={!note.trim()}
            onClick={() => onConfirm(note.trim())}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function MarketsListPage() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [proposals, setProposals] = useState<MarketProposal[]>([]);
  const [marketStats, setMarketStats] = useState<Map<string, MarketStats>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('Live');
  const [search, setSearch] = useState('');
  const [pendingNote, setPendingNote] = useState<{ kind: 'reject' | 'duplicate'; proposal: MarketProposal } | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAll = async () => {
    const [marketsResult, proposalsResult] = await Promise.all([fetchMarkets(), fetchProposals()]);
    return { marketsResult, proposalsResult };
  };

  useEffect(() => {
    let cancelled = false;
    fetchAll()
      .then(({ marketsResult, proposalsResult }) => {
        if (cancelled) return;
        setMarkets(marketsResult);
        setProposals(proposalsResult);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load markets. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchMarketAdminStats(markets.map((market) => market.id))
      .then((stats) => {
        if (!cancelled) setMarketStats(stats);
      })
      .catch(() => {
        // Non-critical: the list is fully usable without volume/contract data,
        // so a failed stats fetch just leaves those columns showing "—".
        if (!cancelled) setMarketStats(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [markets]);

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);
    fetchAll()
      .then(({ marketsResult, proposalsResult }) => {
        setMarkets(marketsResult);
        setProposals(proposalsResult);
      })
      .catch(() => setLoadError('Could not load markets. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  const counts = useMemo(() => {
    const map = new Map<TabKey, number>();
    for (const tab of MARKET_TABS) {
      map.set(
        tab.key,
        markets.filter((market) => tab.statuses.includes(market.status)).length,
      );
    }
    map.set('Proposals', proposals.filter((p) => p.status === 'New' || p.status === 'Under Review').length);
    return map;
  }, [markets, proposals]);

  const query = search.trim().toLowerCase();
  const visibleMarkets = useMemo(() => {
    if (activeTab === 'Proposals') return [];
    const tab = MARKET_TABS.find((item) => item.key === activeTab)!;
    return markets
      .filter((market) => tab.statuses.includes(market.status))
      .filter((market) =>
        !query || market.eventLabel.toLowerCase().includes(query) || market.question.toLowerCase().includes(query),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [markets, activeTab, query]);

  const visibleProposals = useMemo(() => {
    if (activeTab !== 'Proposals') return [];
    return proposals
      .filter(
        (proposal) =>
          !query ||
          proposal.eventLabel.toLowerCase().includes(query) ||
          proposal.suggestedQuestion.toLowerCase().includes(query),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [proposals, query, activeTab]);

  const handleConvert = async (proposal: MarketProposal) => {
    navigate('/dashboard/admin/markets/create', {
      state: {
        seedEventLabel: proposal.eventLabel,
        seedQuestion: proposal.suggestedQuestion,
        sourceProposalId: proposal.id,
      },
    });
  };

  const handleStartReview = async (proposal: MarketProposal) => {
    try {
      const updated = await startProposalReview(proposal.id);
      setProposals((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update this proposal.');
    }
  };

  const handleConfirmNote = async (note: string) => {
    if (!pendingNote) return;
    try {
      const updated =
        pendingNote.kind === 'reject'
          ? await rejectProposal(pendingNote.proposal.id, note)
          : await markProposalDuplicate(pendingNote.proposal.id, note);
      setProposals((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setPendingNote(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update this proposal.');
    }
  };

  return (
    <AdminLayout>
      <div className="mkt-list">
        <div className="mkt-list__header">
          <div>
            <p className="mkt-eyebrow">Welcome back</p>
            <h1>Markets</h1>
            <p>Create, publish, and track prediction markets across every sport League OS covers.</p>
          </div>
          <button
            type="button"
            className="mkt-btn mkt-btn--gradient"
            onClick={() => navigate('/dashboard/admin/markets/create')}
          >
            <FiPlus /> Create Market
          </button>
        </div>

        {(loadError || actionError) && (
          <div className="mkt-error-banner">
            <FiAlertTriangle aria-hidden="true" />
            <span>{loadError ?? actionError}</span>
            {loadError && (
              <button type="button" className="mkt-btn mkt-btn--outline mkt-btn--sm" onClick={handleRetry}>
                Retry
              </button>
            )}
            {actionError && !loadError && (
              <button
                type="button"
                className="mkt-btn mkt-btn--outline mkt-btn--sm"
                onClick={() => setActionError(null)}
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="mkt-loading">
            <FiActivity aria-hidden="true" className="mkt-loading__icon" />
            Loading markets…
          </div>
        ) : (
          <div className="mkt-panel">
            <div className="mkt-panel__toolbar">
              <div className="mkt-tabs" role="tablist">
                {[...MARKET_TABS.map((tab) => tab.key), 'Proposals' as const].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`mkt-tab${activeTab === tab ? ' is-active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab} <span>{counts.get(tab) ?? 0}</span>
                  </button>
                ))}
              </div>
              <label className="mkt-search">
                <FiSearch aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search event or question…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>

            {activeTab === 'Proposals' ? (
              <div className="mkt-table-scroll">
                <table className="mkt-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Suggested Question</th>
                      <th>Submitted By</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProposals.map((proposal) => (
                      <tr key={proposal.id}>
                        <td className="mkt-table__title-cell">{proposal.eventLabel}</td>
                        <td className="mkt-table__title-cell">{proposal.suggestedQuestion}</td>
                        <td>{proposal.submittedBy}</td>
                        <td>
                          <span className={proposalStatusPillClass(proposal.status)}>{proposal.status}</span>
                        </td>
                        <td>
                          {(proposal.status === 'New' || proposal.status === 'Under Review') && (
                            <div className="mkt-row-actions">
                              {proposal.status === 'New' && (
                                <button
                                  type="button"
                                  className="mkt-btn mkt-btn--outline mkt-btn--sm"
                                  onClick={() => handleStartReview(proposal)}
                                >
                                  Start Review
                                </button>
                              )}
                              <button
                                type="button"
                                className="mkt-btn mkt-btn--gradient mkt-btn--sm"
                                onClick={() => handleConvert(proposal)}
                              >
                                Convert to Draft
                              </button>
                              <button
                                type="button"
                                className="mkt-btn mkt-btn--outline mkt-btn--sm"
                                title="A specific duplicate market or proposal must be selected; this screen does not support that yet."
                                onClick={() => setActionError('Select a specific duplicate market or proposal before marking a duplicate. This screen does not support target selection yet.')}
                              >
                                <FiCopy /> Duplicate
                              </button>
                              <button
                                type="button"
                                className="mkt-btn mkt-btn--danger mkt-btn--sm"
                                onClick={() => setPendingNote({ kind: 'reject', proposal })}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {visibleProposals.length === 0 && (
                      <tr>
                        <td colSpan={5} className="mkt-table__empty">
                          No proposals match this view.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mkt-table-scroll">
                <table className="mkt-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Category</th>
                      <th>Volume</th>
                      <th>Contracts</th>
                      <th>Status</th>
                      <th>Kickoff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMarkets.map((market) => {
                      const stats = marketStats.get(market.id);
                      return (
                        <tr key={market.id} onClick={() => navigate(`/dashboard/admin/markets/${market.id}`)}>
                          <td className="mkt-table__title-cell">
                            <strong>{market.eventLabel}</strong>
                            <span className="mkt-table__subtext">{market.question}</span>
                          </td>
                          <td>{market.category}</td>
                          <td aria-label={stats ? undefined : 'Volume unavailable'}>
                            {stats ? formatUgx(stats.volumeUgx) : '—'}
                          </td>
                          <td aria-label={stats ? undefined : 'Contract count unavailable'}>
                            {stats ? stats.fillCount : '—'}
                          </td>
                          <td>
                            <span className={statusPillClass(market.status)}>{market.status}</span>
                          </td>
                          <td>{formatDateTime(market.kickoff)}</td>
                        </tr>
                      );
                    })}
                    {visibleMarkets.length === 0 && (
                      <tr>
                        <td colSpan={6} className="mkt-table__empty">
                          No markets match this view.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {pendingNote && (
        <NoteModal
          title={pendingNote.kind === 'reject' ? 'Reject Proposal' : 'Mark as Duplicate'}
          confirmLabel={pendingNote.kind === 'reject' ? 'Reject' : 'Mark Duplicate'}
          onCancel={() => setPendingNote(null)}
          onConfirm={handleConfirmNote}
        />
      )}
    </AdminLayout>
  );
}

export default MarketsListPage;
