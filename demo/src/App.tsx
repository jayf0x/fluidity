import { memo, useState } from 'react';

import { FPSTracker } from './components/FPSTracker';
import { TABS, TabNav } from './components/TabNav';
import { ImageExample } from './examples/ImageExample';
import { SplashExample } from './examples/SplashExample';
import { SplitExample } from './examples/SplitExample';
import { TextExample } from './examples/TextExample';

type Tab = (typeof TABS)[number]['id'];

const EXAMPLE_MAP: Record<Tab, React.ComponentType> = {
  text: TextExample,
  image: ImageExample,
  splash: SplashExample,
  split: SplitExample,
};

const GithubLink = memo(() => (
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
));

export function App() {
  const [tab, setTab] = useState<Tab>('text');
  const Example = EXAMPLE_MAP[tab];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0a0a' }}>
      <TabNav tab={tab} onTabChange={setTab} />
      <FPSTracker />
      <div style={{ width: '100%', height: '100%' }}>
        <Example />
      </div>
      <GithubLink />
    </div>
  );
}
