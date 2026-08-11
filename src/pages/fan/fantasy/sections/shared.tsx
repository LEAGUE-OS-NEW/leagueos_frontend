import React from 'react';
import type { Sport } from '../types';

// ---------------------------------------------------------------------------
// Icons — plain inline SVG, no icon-font dependency
// ---------------------------------------------------------------------------
export const SearchIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const FilterIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="11" y1="18" x2="13" y2="18" />
  </svg>
);

export const CloseIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const ChevronIcon = ({ size = 16, dir = 'right' }: { size?: number; dir?: 'right' | 'down' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: dir === 'down' ? 'rotate(90deg)' : undefined, transition: 'transform .15s' }}
  >
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

export const BellIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const TrophyIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4z" />
    <path d="M7 5H4a1 1 0 0 0-1 1c0 2.5 1.5 4 4 4M17 5h3a1 1 0 0 1 1 1c0 2.5-1.5 4-4 4" />
  </svg>
);

export const SPORT_META: Record<Sport, { label: string; emoji: string }> = {
  football: { label: 'Football', emoji: '⚽' },
  basketball: { label: 'Basketball', emoji: '🏀' },
  rugby: { label: 'Rugby', emoji: '🏉' },
};

// ---------------------------------------------------------------------------
// SearchBar
// ---------------------------------------------------------------------------
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search players…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-bar">
      <SearchIcon />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button className="search-clear" onClick={() => onChange('')} aria-label="Clear search">
          <CloseIcon size={14} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sport filter tabs — "All" + one per sport
// ---------------------------------------------------------------------------
export function SportFilter({
  value,
  onChange,
}: {
  value: Sport | 'all';
  onChange: (v: Sport | 'all') => void;
}) {
  const sports: (Sport | 'all')[] = ['all', 'football', 'basketball', 'rugby'];
  return (
    <div className="sport-filter" role="tablist" aria-label="Filter by sport">
      {sports.map((s) => (
        <button
          key={s}
          role="tab"
          aria-selected={value === s}
          className={`sport-chip ${value === s ? 'active' : ''}`}
          onClick={() => onChange(s)}
        >
          <span className="sport-chip-emoji">{s === 'all' ? '🏆' : SPORT_META[s].emoji}</span>
          {s === 'all' ? 'All sports' : SPORT_META[s].label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Misc primitives
// ---------------------------------------------------------------------------
export function StatCard({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: string }) {
  return (
    <div className="stat-card" style={accent ? { borderLeftColor: accent } : undefined}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Badge({ tone, children }: { tone: 'green' | 'orange' | 'red' | 'purple' | 'blue' | 'gray'; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: string | number }) {
  return <div className="skeleton" style={{ height, width }} />;
}
