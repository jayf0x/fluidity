import { useEffect, useRef, useState } from 'react';

export const FPSTracker = () => {
  const rafRef = useRef<number | null>(null);
  const lastFpsUpdateRef = useRef(0);
  const lastFrameRef = useRef(0);
  const smoothedFpsRef = useRef<number | null>(null);

  const [stats, setStats] = useState({ fps: 60, ms: 16.6 });

  useEffect(() => {
    lastFrameRef.current = 0;
    lastFpsUpdateRef.current = 0;
    smoothedFpsRef.current = null;

    function frame(now: number) {
      if (lastFrameRef.current === 0) {
        lastFrameRef.current = now;
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;
      if (dt <= 0) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      const instantFps = 1000 / dt;
      smoothedFpsRef.current =
        smoothedFpsRef.current === null
          ? instantFps
          : smoothedFpsRef.current * 0.85 + instantFps * 0.15;
      if (lastFpsUpdateRef.current === 0 || now - lastFpsUpdateRef.current > 250) {
        setStats({ fps: Math.round(smoothedFpsRef.current), ms: Number(dt.toFixed(2)) });
        lastFpsUpdateRef.current = now;
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 5,
        left: 5,
        padding: '5px 9px',
        background: 'rgba(0,0,0,0.7)',
        color: '#00ff88',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
        borderRadius: 6,
        pointerEvents: 'none',
        zIndex: 9999,
        lineHeight: 1.6,
      }}
    >
      <div>{stats.fps} fps</div>
      <div>{stats.ms} ms</div>
    </div>
  );
};
