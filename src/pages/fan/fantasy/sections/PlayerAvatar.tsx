
import type { Player } from '../types';

interface Props {
  player: Player;
  size?: number;
  showJersey?: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(' ');
  return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '');
}

/**
 * Every player gets a generated jersey-style avatar (initials over a club-
 * coloured kit) instead of a photo. This keeps the pitch/market visual while
 * avoiding any dependency on external images.
 */
export default function PlayerAvatar({ player, size = 56, showJersey = true }: Props) {
  const id = `av-${player.id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`${player.name} avatar`}
      className="player-avatar"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={player.clubColor} stopOpacity="0.95" />
          <stop offset="100%" stopColor={player.clubColor} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill="url(#av-bg)" opacity="0" />
      <circle cx="32" cy="32" r="30" fill="#12142b" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      {showJersey && (
        <path
          d="M18 24 L24 16 L32 20 L40 16 L46 24 L41 30 L38 27 L38 50 L26 50 L26 27 L23 30 Z"
          fill={`url(#${id})`}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.5"
        />
      )}
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fontFamily="'Space Grotesk', sans-serif"
        fill="#f5f5fa"
      >
        {initials(player.name).toUpperCase()}
      </text>
      {player.status !== 'ready' && (
        <circle
          cx="52"
          cy="12"
          r="7"
          fill={player.status === 'doubtful' ? '#d6a218' : player.status === 'suspended' ? '#f4661b' : '#e0292f'}
          stroke="#0a0b1a"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}
