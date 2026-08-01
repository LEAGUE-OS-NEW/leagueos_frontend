import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import './BackButton.css';

type BackButtonProps = {
  /** Button label text */
  label?: string;
  /** Extra CSS class */
  className?: string;
  /**
   * Explicit route to navigate to.
   * When omitted the button calls navigate(-1) — go back in browser history.
   * Pass a path like "/" to always land on the landing page regardless of history.
   */
  to?: string;
};

export default function BackButton({
  label = 'Back',
  className = '',
  to,
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      type="button"
      className={`back-button ${className}`.trim()}
      onClick={handleClick}
    >
      <ArrowBackIcon aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
