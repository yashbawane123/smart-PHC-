import React from 'react';

/**
 * TallyDots component for zero-literacy numeral backup.
 * Renders visual dots (🔵) grouped in sets of 5 for easy counting.
 */
export default function TallyDots({ count = 0, maxDisplay = 25, color = 'var(--color-primary)' }) {
  const displayCount = Math.min(count, maxDisplay);
  const overflow = count > maxDisplay;

  if (count <= 0) {
    return <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600 }}>◯ शून्य (0)</span>;
  }

  const dots = Array.from({ length: displayCount });

  return (
    <div className="tally-dots-container">
      {dots.map((_, idx) => {
        const isFifth = (idx + 1) % 5 === 0;
        return (
          <span
            key={idx}
            className={`tally-dot ${isFifth ? 'group-5' : ''}`}
            style={{ backgroundColor: color }}
            title={`Dot ${idx + 1}`}
          />
        );
      })}
      {overflow && (
        <span style={{ fontSize: '12px', fontWeight: 800, color: color, marginLeft: '4px' }}>
          +{count - maxDisplay}
        </span>
      )}
    </div>
  );
}
