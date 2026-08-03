import './RingGauge.css';

export type RingGaugeSegment = {
  value: number;
  color: string;
};

type RingGaugeProps = {
  segments: RingGaugeSegment[];
  centerValue: string;
  centerCaption?: string;
  ariaLabel: string;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
};

function RingGauge({
  segments,
  centerValue,
  centerCaption,
  ariaLabel,
  size = 148,
  strokeWidth = 14,
  trackColor = 'var(--color-border)',
}: RingGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const arcs = segments.reduce<{ segment: RingGaugeSegment; start: number }[]>((acc, segment) => {
    const previousEnd = acc.length > 0 ? acc[acc.length - 1].start + acc[acc.length - 1].segment.value : 0;
    return [...acc, { segment, start: previousEnd }];
  }, []);

  return (
    <div className="ring-gauge" style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
          {arcs.map(({ segment, start }, index) => {
            const segmentLength = (segment.value / 100) * circumference;
            const dashoffset = -((start / 100) * circumference);

            return (
              <circle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={dashoffset}
                className="ring-gauge-segment"
              />
            );
          })}
        </g>
      </svg>

      <div className="ring-gauge-center">
        <span className="ring-gauge-value">{centerValue}</span>
        {centerCaption && <span className="ring-gauge-caption">{centerCaption}</span>}
      </div>
    </div>
  );
}

export default RingGauge;
