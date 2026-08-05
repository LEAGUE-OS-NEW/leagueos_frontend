import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiCheckCircle, FiClock } from 'react-icons/fi';
import Navbar from '../../../components/landing/Navbar';
import Footer from '../../../components/landing/Footer';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import {
  fetchClubBySlug,
  fetchFollowedClubSlugs,
  followClub,
  unfollowClub,
  type ClubSummary,
} from '../../../services/clubsService';
import OverviewTab from './sections/OverviewTab';
import SquadTab from './sections/SquadTab';
import FixturesTab from './sections/FixturesTab';
import './ClubProfile.css';

function CrestPlaceholder() {
  return (
    <div className="club-profile__crest-placeholder" aria-hidden="true">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3l7 2.6v5.4c0 4.6-3 8-7 9.4-4-1.4-7-4.8-7-9.4V5.6L12 3z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeDasharray="2.5 2.5"
        />
      </svg>
    </div>
  );
}

type TabId = 'overview' | 'squad' | 'fixtures';
const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'squad', label: 'Squad' },
  { id: 'fixtures', label: 'Fixtures' },
];

function ClubProfile() {
  const { clubSlug } = useParams<{ clubSlug: string }>();
  const { profile } = useCurrentUser();
  const isLoggedIn = Boolean(profile);

  const [club, setClub] = useState<ClubSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    if (!clubSlug) return;
    let cancelled = false;

    fetchClubBySlug(clubSlug).then((result) => {
      if (!cancelled) {
        setClub(result);
        setIsLoading(false);
      }
    });

    if (isLoggedIn) {
      fetchFollowedClubSlugs().then((slugs) => {
        if (!cancelled) setIsFollowing(slugs.includes(clubSlug));
      });
    }

    return () => {
      cancelled = true;
    };
  }, [clubSlug, isLoggedIn]);

  const handleToggleFollow = async () => {
    if (!clubSlug) return;
    if (isFollowing) {
      await unfollowClub(clubSlug);
      setIsFollowing(false);
    } else {
      await followClub(clubSlug);
      setIsFollowing(true);
    }
  };

  return (
    <div className="club-profile-page">
      <Navbar />

      <main className="club-profile-main">
        {isLoading ? (
          <p className="club-profile-status">Loading club profile…</p>
        ) : !club ? (
          <div className="profile-empty-state">
            <p className="profile-empty-state__title">Club not found</p>
            <p>We couldn't find that club. It may have been removed or the link is incorrect.</p>
          </div>
        ) : (
          <>
            <div className="club-profile-header">
              {club.crest ? (
                <img src={club.crest} alt={`${club.name} crest`} className="club-profile__crest" />
              ) : (
                <CrestPlaceholder />
              )}

              <div className="club-profile-header__info">
                <div className="club-profile-header__title-row">
                  <h1>{club.name}</h1>
                  <span
                    className={`profile-verify-badge profile-verify-badge--${club.verificationStatus.toLowerCase()}`}
                  >
                    {club.verificationStatus === 'Verified' ? <FiCheckCircle /> : <FiClock />}
                    {club.verificationStatus === 'Verified' ? 'Official Club' : 'Verification Pending'}
                  </span>
                </div>
                <p className="club-profile-header__meta">
                  {club.sport} · {club.league}
                </p>
              </div>

              {isLoggedIn && (
                <button
                  type="button"
                  className={`club-profile-follow-btn${isFollowing ? ' is-following' : ''}`}
                  onClick={handleToggleFollow}
                >
                  {isFollowing ? 'Following' : 'Follow Club'}
                </button>
              )}
            </div>

            <div className="club-profile-tabs" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`club-profile-tab${activeTab === tab.id ? ' is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && <OverviewTab club={club} />}
            {activeTab === 'squad' && <SquadTab clubSlug={club.slug} />}
            {activeTab === 'fixtures' && <FixturesTab clubSlug={club.slug} />}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default ClubProfile;
