import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  id,
  style,
  disabled,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 500,
            color: error ? 'var(--color-danger)' : 'var(--color-text-secondary)'
          }}
        >
          {label}
        </label>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          backgroundColor: 'var(--color-surface-solid)',
          border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)',
          transition: 'border-color var(--transition-fast)'
        }}
      >
        {leftIcon && (
          <span style={{ paddingLeft: '0.75rem', color: 'var(--color-text-muted)', display: 'flex' }}>
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          disabled={disabled}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '0.65rem 0.85rem',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-base)',
            fontFamily: 'inherit',
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
            ...style
          }}
          {...props}
        />

        {rightIcon && (
          <span style={{ paddingRight: '0.75rem', color: 'var(--color-text-muted)', display: 'flex' }}>
            {rightIcon}
          </span>
        )}
      </div>

      {error ? (
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>
          {error}
        </span>
      ) : helperText ? (
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
};
