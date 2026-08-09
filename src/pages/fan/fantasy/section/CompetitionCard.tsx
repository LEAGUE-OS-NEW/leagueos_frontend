import React from 'react';
import type { Competition } from '../FantasyCompetitions';

interface CompetitionCardProps {
  competition: Competition;
  accent: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const CompetitionCard: React.FC<CompetitionCardProps> = ({ competition, accent, isSelected, onSelect }) => {
  return (
    <article
      className={`comp-card${isSelected ? ' comp-card--active' : ''}`}
      style={{ ['--accent' as string]: accent }}
    >
      <div className="comp-card__media">
        <img src={competition.image} alt={`${competition.name} banner`} loading="lazy" />
        <span className={`comp-card__pill comp-card__pill--${competition.entryType}`}>
          {competition.entryType === 'public' ? 'Public entry' : 'Private · invite only'}
        </span>
        <span className="comp-card__gw">{competition.gameweek}</span>
      </div>
      <div className="comp-card__body">
        <h3 className="comp-card__title">{competition.name}</h3>
        <p className="comp-card__rules">{competition.rulesSummary}</p>
        <dl className="comp-card__stats">
          <div>
            <dt>Managers</dt>
            <dd>{competition.managers.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Prize pool</dt>
            <dd>{competition.prizePool}</dd>
          </div>
        </dl>
        <button type="button" className="comp-card__cta" onClick={() => onSelect(competition.id)}>
          {isSelected ? 'Selected — continue below' : 'View & join'}
        </button>
      </div>
    </article>
  );
};

export default CompetitionCard;
