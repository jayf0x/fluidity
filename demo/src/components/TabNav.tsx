import { useEffect, useRef, useState } from 'react';

type Tab = 'text' | 'image' | 'splash' | 'split';

export const TABS: { id: Tab; label: string }[] = [
  { id: 'text', label: 'text' },
  { id: 'image', label: 'image' },
  { id: 'splash', label: 'auto-splash' },
  { id: 'split', label: 'split view' },
];

interface TabNavProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TabNav({ tab, onTabChange }: TabNavProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    const idx = TABS.findIndex((t) => t.id === tab);
    const btn = btnRefs.current[idx];
    const nav = navRef.current;
    if (!btn || !nav) return;
    const btnRect = btn.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    setIndicator({ left: btnRect.left - navRect.left, width: btnRect.width, ready: true });
  }, [tab]);

  return (
    <nav
      ref={navRef}
      style={{
        position: 'absolute',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 0,
        background: 'rgba(10,10,14,0.88)',
        backdropFilter: 'blur(16px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 99,
        padding: 4,
        zIndex: 20,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: indicator.left,
          width: indicator.width,
          background: 'rgba(91,143,249,0.14)',
          border: '1px solid rgba(91,143,249,0.28)',
          boxShadow: '0 0 14px rgba(91,143,249,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
          borderRadius: 99,
          transition: indicator.ready ? 'left 0.22s cubic-bezier(.4,0,.2,1), width 0.22s cubic-bezier(.4,0,.2,1)' : 'none',
          pointerEvents: 'none',
        }}
      />
      {TABS.map(({ id, label }, i) => {
        const active = tab === id;
        return (
          <button
            key={id}
            ref={(el) => (btnRefs.current[i] = el)}
            onClick={() => onTabChange(id)}
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '5px 15px',
              borderRadius: 99,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'ui-monospace, "SF Mono", monospace',
              fontWeight: active ? 600 : 400,
              background: 'transparent',
              color: active ? 'rgba(220,232,255,0.95)' : 'rgba(255,255,255,0.28)',
              letterSpacing: active ? '0.01em' : '0',
              transition: 'color 0.18s, font-weight 0.18s',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}
