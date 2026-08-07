import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import SafeImage from '../SafeImage/SafeImage';
import type { SearchResult, Sport } from '../../services/searchService';
import './ResultCard.css';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function CrestFallback({ label }: { label: string }) {
  return <span className="rc-crest-fallback">{initials(label)}</span>;
}

function sportBadgeClass(sport?: Sport): string {
  switch (sport) {
    case 'Football':
      return 'rc-sport-badge rc-sport-badge--football';
    case 'Rugby':
      return 'rc-sport-badge rc-sport-badge--rugby';
    case 'Basketball':
      return 'rc-sport-badge rc-sport-badge--basketball';
    default:
      return 'rc-sport-badge';
  }
}

function CardShell({ to, kindLabel, children }: { to?: string; kindLabel: string; children: ReactNode }) {
  const content = (
    <>
      <span className="rc-kind-label">{kindLabel}</span>
      {children}
    </>
  );

  if (!to) {
    return <article className="rc-card rc-card--static">{content}</article>;
  }

  return (
    <Link to={to} className="rc-card">
      {content}
    </Link>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  switch (result.kind) {
    case 'club':
      return (
        <CardShell to={`/clubs/${result.slug}`} kindLabel="Club">
          <div className="rc-row">
            <SafeImage
              src={result.crestUrl}
              alt={result.name}
              className="rc-crest"
              fallback={<CrestFallback label={result.name} />}
            />
            <div>
              <p className="rc-title">{result.name}</p>
              {result.sport && <span className={sportBadgeClass(result.sport)}>{result.sport}</span>}
            </div>
          </div>
        </CardShell>
      );

    case 'competition':
      return (
        <CardShell to="/clubs" kindLabel="Competition">
          <p className="rc-title">{result.name}</p>
          {result.league && result.league !== result.name && <p className="rc-subtitle">{result.league}</p>}
          {result.sport && <span className={sportBadgeClass(result.sport)}>{result.sport}</span>}
        </CardShell>
      );

    case 'fixture':
      return (
        <CardShell to={`/matches/${result.fixtureId}`} kindLabel="Fixture">
          <div className="rc-row">
            <SafeImage
              src={result.homeCrestUrl}
              alt={result.homeTeam}
              className="rc-crest rc-crest--sm"
              fallback={<CrestFallback label={result.homeTeam} />}
            />
            <p className="rc-title rc-title--fixture">
              {result.homeTeam} vs {result.awayTeam}
            </p>
            <SafeImage
              src={result.awayCrestUrl}
              alt={result.awayTeam}
              className="rc-crest rc-crest--sm"
              fallback={<CrestFallback label={result.awayTeam} />}
            />
          </div>
          <p className="rc-subtitle">{result.competition}</p>
          <p className="rc-meta">
            {formatDateTime(result.kickoff)}
            {result.venue ? ` · ${result.venue}` : ''}
          </p>
        </CardShell>
      );

    case 'player':
      return (
        <CardShell to={`/clubs/${result.clubSlug}/players/${result.playerId}`} kindLabel="Player">
          <div className="rc-row">
            <SafeImage
              src={result.photoUrl}
              alt={result.name}
              className="rc-crest"
              fallback={<CrestFallback label={result.name} />}
            />
            <div>
              <p className="rc-title">{result.name}</p>
              <p className="rc-subtitle">
                {result.position} · {result.club}
              </p>
            </div>
          </div>
        </CardShell>
      );

    case 'news':
      return (
        <CardShell to="/news" kindLabel="News">
          <SafeImage
            src={result.imageUrl}
            alt={result.title}
            className="rc-news-image"
            fallback={<CrestFallback label={result.title} />}
          />
          <p className="rc-title">{result.title}</p>
          <p className="rc-desc">{result.description}</p>
          <p className="rc-meta">{result.timeAgo}</p>
        </CardShell>
      );

    case 'market':
      return (
        <CardShell to="/markets" kindLabel="Market">
          <p className="rc-title">{result.question}</p>
          {result.teams.length > 0 && <p className="rc-subtitle">{result.teams.join(' vs ')}</p>}
          <p className="rc-meta">Closes {formatDateTime(result.closesAt)}</p>
        </CardShell>
      );
  }
}

export default ResultCard;
