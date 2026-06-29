import type { ComponentType } from 'react';
import { useState } from 'react';

import { getShowcases } from 'frontis';
import { Showcase } from 'frontis/react';

import { FPSTracker } from './components/FPSTracker';
import { TabNav } from './components/TabNav';
import './examples/AutoSplatExample';
import './examples/BackgroundExample';
import './examples/ImageExample';
import './examples/SplitExample';
// Import for side effect: each file calls defineShowcase. Order here = nav order.
import './examples/TextExample';

const showcases = getShowcases();
const tabs = showcases.map((s) => ({ id: s.id, label: s.title }));

export function App() {
  const [activeId, setActiveId] = useState(showcases[0].id);
  const current = showcases.find((s) => s.id === activeId) ?? showcases[0];
  const Example = current.component as ComponentType;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0a0a' }}>
      <TabNav tabs={tabs} activeId={activeId} onSelect={setActiveId} />
      <FPSTracker />
      <div style={{ width: '100%', height: '100%' }}>
        {/* key remounts the Showcase per tab → fresh isolated store, like the old per-example useCreateStore */}
        <Showcase key={activeId}>
          <Example />
        </Showcase>
      </div>
      <a
        href="https://github.com/jayf0x/fluidity"
        target="_blank"
        rel="noreferrer"
        style={{
          position: 'absolute',
          bottom: '1vh',
          left: '1vw',
          fontSize: 12,
          fontFamily: 'ui-monospace, monospace',
          color: 'rgba(255,255,255,0.18)',
          textDecoration: 'none',
          zIndex: 9999,
          letterSpacing: '0.04em',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}
      >
        github ↗
      </a>
    </div>
  );
}
