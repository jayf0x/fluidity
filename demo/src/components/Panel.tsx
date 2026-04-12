import React from 'react';

interface PanelProps {
  children: React.ReactNode;
  position?: 'bottom-left' | 'bottom-right' | 'top-right';
}

export function Panel({ children, position = 'bottom-left' }: PanelProps) {
  const pos: React.CSSProperties =
    position === 'bottom-right'
      ? { bottom: 16, right: 16 }
      : position === 'top-right'
      ? { top: 56, right: 16 }
      : { bottom: 16, left: 16 };

  return (
    <div
      style={{
        position: 'absolute',
        ...pos,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: 'rgba(10,10,14,0.82)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        padding: '10px 14px',
        color: '#bbb',
        fontSize: 11,
        fontFamily: 'ui-monospace, "SF Mono", monospace',
        minWidth: 200,
        zIndex: 10,
      }}
    >
      {children}
    </div>
  );
}

interface RowProps {
  label: string;
  children: React.ReactNode;
}
export function Row({ label, children }: RowProps) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <span style={{ color: '#666', flexShrink: 0 }}>{label}</span>
      {children}
    </label>
  );
}

export const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#eee',
  borderRadius: 5,
  padding: '2px 7px',
  width: 110,
  fontSize: 11,
  fontFamily: 'inherit',
};

export const rangeStyle: React.CSSProperties = {
  width: 110,
  accentColor: '#5b8ff9',
};

export const btnStyle: React.CSSProperties = {
  padding: '4px 12px',
  borderRadius: 5,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.06)',
  color: '#ddd',
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: 'inherit',
};

export const divider: React.CSSProperties = {
  borderTop: '1px solid rgba(255,255,255,0.06)',
  margin: '2px 0',
};
