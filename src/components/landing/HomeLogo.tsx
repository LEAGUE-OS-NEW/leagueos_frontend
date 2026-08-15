import { Link, useLocation } from 'react-router-dom';
import './HomeLogo.css';

type HomeLogoProps = {
  className: string;
  imageClassName: string;
  tooltipPosition?: 'top' | 'bottom';
  onClick?: () => void;
};

function HomeLogo({ className, imageClassName, tooltipPosition = 'bottom', onClick }: HomeLogoProps) {
  const location = useLocation();
  const isOnLanding = location.pathname === '/';

  return (
    <Link to="/" className={`home-logo-link ${className}`} onClick={onClick}>
      <img src="/logos/logo.png" alt="League OS" className={imageClassName} />
      {!isOnLanding && (
        <span className={`home-logo-tooltip${tooltipPosition === 'top' ? ' home-logo-tooltip--top' : ''}`}>
          Back to Home
        </span>
      )}
    </Link>
  );
}

export default HomeLogo;
