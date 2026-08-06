import { useId } from 'react';
import { FiInfo } from 'react-icons/fi';
import './InfoTooltip.css';

function InfoTooltip({ text, label }: { text: string; label: string }) {
  const id = useId();

  return (
    <span className="info-tooltip">
      <button type="button" className="info-tooltip-trigger" aria-describedby={id} aria-label={label}>
        <FiInfo aria-hidden="true" />
      </button>
      <span className="info-tooltip-bubble" role="tooltip" id={id}>
        {text}
      </span>
    </span>
  );
}

export default InfoTooltip;
