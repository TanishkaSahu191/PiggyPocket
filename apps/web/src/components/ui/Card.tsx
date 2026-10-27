import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'outlined';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  interactive = false,
  style,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'solid':
        return {
          backgroundColor: 'var(--color-surface-card)',
          border: '1px solid var(--color-border)'
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          border: '1px solid var(--color-border)'
        };
      case 'glass':
      default:
        return {
          backgroundColor: 'var(--color-surface)',
          backdropFilter: 'var(--backdrop-blur)',
          WebkitBackdropFilter: 'var(--backdrop-blur)',
          border: '1px solid var(--color-border)'
        };
    }
  };

  const cardStyles: React.CSSProperties = {
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--spacing-5)',
    boxShadow: 'var(--shadow-md)',
    transition: 'all var(--transition-normal)',
    cursor: interactive ? 'pointer' : 'default',
    ...getVariantStyles(),
    ...style
  };

  return (
    <div style={cardStyles} {...props}>
      {children}
    </div>
  );
};
