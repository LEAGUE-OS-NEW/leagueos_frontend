import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiActivity, FiAlertTriangle, FiSearch } from 'react-icons/fi';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import ResultCard from '../../components/search/ResultCard';
import LoadMoreSentinel from '../../components/search/LoadMoreSentinel';
import { useInfiniteResults } from '../../components/search/useInfiniteResults';
import { useAuthStore } from '../../store/authStore.ts';
import {
  fetchSearchResults,
  type SearchResult,
  type SearchResultKind,
  type Sport,
} from '../../services/searchService';
import './SearchPage.css';

const SPORT_FILTERS: Array<'All' | Sport> = ['All', 'Football', 'Rugby', 'Basketball'];

const ENTITY_TABS: Array<{ value: 'All' | SearchResultKind; label: string }> = [
  { value: 'All', label: 'All' },
  { value: 'club', label: 'Clubs' },
  { value: 'competition', label: 'Competitions' },
  { value: 'fixture', label: 'Fixtures' },
  { value: 'player', label: 'Players' },
  { value: 'news', label: 'News' },
  { value: 'market', label: 'Markets' },
  { value: 'ticket', label: 'Tickets' },
  { value: 'fantasyLeague', label: 'Fantasy Leagues' },
];

function matchesQuery(result: SearchResult, query: string): boolean {
  switch (result.kind) {
    case 'club':
      return result.name.toLowerCase().includes(query);
    case 'competition':
      return result.name.toLowerCase().includes(query) || Boolean(result.league?.toLowerCase().includes(query));
    case 'fixture':
      return (
        result.homeTeam.toLowerCase().includes(query) ||
        result.awayTeam.toLowerCase().includes(query) ||
        result.competition.toLowerCase().includes(query)
      );
    case 'player':
      return result.name.toLowerCase().includes(query) || result.club.toLowerCase().includes(query);
    case 'news':
      return result.title.toLowerCase().includes(query) || result.description.toLowerCase().includes(query);
    case 'market':
      return (
        result.question.toLowerCase().includes(query) ||
        result.teams.some((team) => team.toLowerCase().includes(query))
      );
    case 'ticket':
      return result.homeTeam.toLowerCase().includes(query) || result.awayTeam.toLowerCase().includes(query);
    case 'fantasyLeague':
      return result.name.toLowerCase().includes(query);
  }
}

function SearchPage() {
  const isSignedIn = Boolean(useAuthStore((state) => state.accessToken));
  const [searchParams] = useSearchParams();

  const [searchText, setSearchText] = useState(() => searchParams.get('q') ?? '');
  const [sportFilter, setSportFilter] = useState<'All' | Sport>('All');
  const [entityTab, setEntityTab] = useState<'All' | SearchResultKind>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [failedSources, setFailedSources] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchSearchResults().then((outcome) => {
      if (cancelled) return;
      setResults(outcome.results);
      setFailedSources(outcome.failedSources);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredResults = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return results.filter((result) => {
      if (entityTab !== 'All' && result.kind !== entityTab) return false;
      if (sportFilter !== 'All' && result.sport !== sportFilter) return false;
      if (!query) return true;
      return matchesQuery(result, query);
    });
  }, [results, searchText, sportFilter, entityTab]);

  const { visibleItems, hasMore, loadMore, reset } = useInfiniteResults(filteredResults, 12);

  const handleSearchTextChange = (value: string) => {
    setSearchText(value);
    reset();
  };

  const handleSportFilterChange = (value: 'All' | Sport) => {
    setSportFilter(value);
    reset();
  };

  const handleEntityTabChange = (value: 'All' | SearchResultKind) => {
    setEntityTab(value);
    reset();
  };

  return (
    <div className="search-page">
      <Navbar />

      <main className="search-main">
        <div className="search-main-inner">
          <section className="search-hero">
            <h1>Search League OS</h1>
            <p>Find clubs, competitions, fixtures, players, news and markets across football, rugby and basketball.</p>
            <label className="search-input-row">
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                placeholder="Search clubs, players, fixtures, news, markets…"
                value={searchText}
                onChange={(event) => handleSearchTextChange(event.target.value)}
              />
            </label>
          </section>

          {!isSignedIn && (
            <div className="search-signup-banner">
              <span>Sign up to save searches and get personalized picks.</span>
              <Link to="/register" className="search-signup-banner__cta">
                Sign Up
              </Link>
            </div>
          )}

          <div className="search-pill-row">
            {SPORT_FILTERS.map((sport) => (
              <button
                key={sport}
                type="button"
                className={`search-pill${sportFilter === sport ? ' is-active' : ''}`}
                onClick={() => handleSportFilterChange(sport)}
              >
                {sport}
              </button>
            ))}
          </div>

          <div className="search-tab-row">
            {ENTITY_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`search-tab${entityTab === tab.value ? ' is-active' : ''}`}
                onClick={() => handleEntityTabChange(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {failedSources.length > 0 && (
            <div className="search-warning-banner">
              <FiAlertTriangle aria-hidden="true" />
              <span>Some results may be unavailable right now ({failedSources.join(', ')}).</span>
            </div>
          )}

          {isLoading ? (
            <div className="search-loading">
              <FiActivity aria-hidden="true" className="search-loading__icon" />
              Loading results…
            </div>
          ) : (
            <>
              <p className="search-results-count">
                {filteredResults.length} result{filteredResults.length === 1 ? '' : 's'}
              </p>

              {filteredResults.length === 0 ? (
                <p className="search-empty">No results match your search. Try a different keyword or filter.</p>
              ) : (
                <>
                  <div className="search-result-grid">
                    {visibleItems.map((result) => (
                      <ResultCard result={result} key={result.id} />
                    ))}
                  </div>
                  <LoadMoreSentinel hasMore={hasMore} onLoadMore={loadMore} />
                </>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default SearchPage;
