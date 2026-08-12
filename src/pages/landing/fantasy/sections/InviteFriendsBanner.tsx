import { Link } from 'react-router-dom';
import { FiUsers } from 'react-icons/fi';
import './InviteFriendsBanner.css';

function InviteFriendsBanner() {
  return (
    <section className="invite-friends-banner">
      <div className="invite-friends-copy">
        <FiUsers className="invite-friends-icon" aria-hidden="true" />
        <div>
          <p className="invite-friends-title">Fantasy is more fun with friends.</p>
          <p className="invite-friends-subtext">Invite your friends, create private leagues and compete together.</p>
        </div>
      </div>

      <Link to="/register" className="fantasy-cta fantasy-cta--primary">
        Sign Up Free
      </Link>
    </section>
  );
}

export default InviteFriendsBanner;
