import { FiCheckCircle, FiSettings, FiUpload } from 'react-icons/fi';
import './OperationsHeader.css';

function OperationsHeader() {
  return (
    <section className="ga-header">
      <div className="ga-header-title">
        <p className="ga-header-welcome">
          Welcome back, Nalubega <FiCheckCircle aria-hidden="true" />
        </p>
        <h1>General Admin Operations</h1>
        <p className="ga-header-subtext">
          Central control for platform operations, data integrity, compliance and user support.
        </p>
      </div>

      <div className="ga-header-actions">
        <span className="ga-header-timestamp">
          <i aria-hidden="true" /> Data as of: 24 May 2026, 16:30 EAT
        </span>

        <button type="button" className="ga-header-export-btn">
          <FiUpload aria-hidden="true" /> Export Dashboard
        </button>

        <button type="button" className="ga-header-configure-btn">
          <FiSettings aria-hidden="true" /> Configure Modules
        </button>
      </div>
    </section>
  );
}

export default OperationsHeader;
