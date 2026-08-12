import { Link, useNavigate } from 'react-router-dom';
import { FiLock, FiArrowLeft, FiHome } from 'react-icons/fi';
import './Unauthorized.css';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="unauth-page">
      <div className="unauth-card">
        <div className="unauth-icon-wrap">
          <FiLock className="unauth-icon" aria-hidden="true" />
        </div>

        <h1 className="unauth-title">Access Denied</h1>
        <p className="unauth-body">
          Your account doesn't have permission to access this area. If you
          believe this is a mistake, contact your Club Admin or League OS
          support.
        </p>

        <div className="unauth-actions">
          <button
            type="button"
            className="unauth-btn unauth-btn-secondary"
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft /> Go Back
          </button>
          <Link to="/" className="unauth-btn unauth-btn-primary">
            <FiHome /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
