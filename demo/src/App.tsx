import { useState } from 'react';

import { ImageExample } from './examples/ImageExample';
import { PresetsExample } from './examples/PresetsExample';
import { SplashExample } from './examples/SplashExample';
import { SplitExample } from './examples/SplitExample';
import { TextExample } from './examples/TextExample';

type Tab = 'text' | 'image' | 'splash' | 'split' | 'presets';

const TABS: { id: Tab; label: string }[] = [
  { id: 'text', label: 'text' },
  { id: 'image', label: 'image' },
  { id: 'splash', label: 'auto-splash' },
  // { id: 'split', label: 'split view' },
  // { id: 'presets', label: 'presets' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('text');

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0a0a' }}>
      {/* ── Nav ─────────────────────────────── */}
      <nav
        style={{
          position: 'absolute',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 4,
          background: 'rgba(10,10,14,0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 99,
          padding: '4px 6px',
          zIndex: 20,
        }}
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: '5px 14px',
              borderRadius: 99,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'ui-monospace, "SF Mono", monospace',
              fontWeight: 500,
              transition: 'background 0.15s, color 0.15s',
              background: tab === id ? '#5b8ff9' : 'transparent',
              color: tab === id ? '#fff' : '#666',
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ── Examples ────────────────────────── */}
      <div style={{ width: '100%', height: '100%' }}>
        {tab === 'text' && <TextExample />}
        {tab === 'image' && <ImageExample />}
        {tab === 'splash' && <SplashExample />}
        {tab === 'split' && <SplitExample />}
        {tab === 'presets' && <PresetsExample />}
      </div>

      {/* ── Watermark ───────────────────────── */}
      <a
        href="https://github.com/jayf0x/fluidity"
        target="_blank"
        rel="noreferrer"
        style={{
          position: 'absolute',
          top: 18,
          right: 16,
          fontSize: 10,
          fontFamily: 'ui-monospace, monospace',
          color: '#333',
          textDecoration: 'none',
          zIndex: 20,
        }}
      >
        fluidity-js ↗
      </a>
    </div>
  );
}
