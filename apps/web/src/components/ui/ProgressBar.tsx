import React from 'react';

export interface ProgressBarProps {
  progress: number; // 0 to 100 percentage
  label?: string;
  sublabel?: string;
  variant?: 'primary' | 'warning' | 'danger';
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  sublabel,
  variant = 'primary',
  height = 8
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  const getColor = (): string => {
    switch (variant) {
      case 'warning':
        return 'var(--color-warning)';
      case 'danger':
        return 'var(--color-danger)';
      case 'primary':
      default:
        return 'var(--color-primary)';
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {(label || sublabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {label && (
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {label}
            </span>
          )}
          {sublabel && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {sublabel}
            </span>
          )}
        </div>
      )}

      <div
        style={{
          width: '100%',
          height: `${height}px`,
          backgroundColor: 'var(--color-surface-solid)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clamped}%`,
            backgroundColor: getColor(),
            borderRadius: 'var(--radius-full)',
            transition: 'width var(--transition-normal)'
          }}
        />
      </div>
    </div>
  );
};
