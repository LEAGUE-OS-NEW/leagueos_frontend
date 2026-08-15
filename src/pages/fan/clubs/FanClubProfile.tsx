import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiChevronLeft } from 'react-icons/fi';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import {
  fetchClubBySlug,
  fetchFollowedClubSlugs,
  followClub,
  unfollowClub,
  type ClubSummary,
} from '../../../services/clubsService';
import OverviewTab from '../../clubs/profile/sections/OverviewTab';
import SquadTab from '../../clubs/profile/sections/SquadTab';
import FixturesTab from '../../clubs/profile/sections/FixturesTab';
import '../sections/FanDashboard.css';
import '../../clubs/profile/ClubProfile.css';
import './FanClubProfile.css';

type TabId = 'overview' | 'squad' | 'fixtures';
const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'squad', label: 'Squad' },
  { id: 'fixtures', label: 'Fixtures' },
];

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

function FanClubProfile() {
  const { clubSlug } = useParams<{ clubSlug: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

    fetchFollowedClubSlugs().then((slugs) => {
      if (!cancelled) setIsFollowing(slugs.includes(clubSlug));
    });

    return () => { cancelled = true; };
  }, [clubSlug]);

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
    <div className="fan-dashboard">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-dashboard-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-dashboard-content fcp-profile-content">

          <Link to="/fan/clubs" className="fcp-profile-back">
            <FiChevronLeft /> Back to Clubs
          </Link>

          {isLoading ? (
            <p className="club-profile-status">Loading club profile…</p>
          ) : !club ? (
            <div className="profile-empty-state">
              <p className="profile-empty-state__title">Club not found</p>
              <p>We couldn't find that club.</p>
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

                <button
                  type="button"
                  className={`club-profile-follow-btn${isFollowing ? ' is-following' : ''}`}
                  onClick={handleToggleFollow}
                >
                  {isFollowing ? 'Following' : 'Follow Club'}
                </button>
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
              {activeTab === 'squad' && <SquadTab clubSlug={club.slug} playerBasePath="/fan/clubs" />}
              {activeTab === 'fixtures' && <FixturesTab clubSlug={club.slug} />}
            </>
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default FanClubProfile;
