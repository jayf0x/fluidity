import { useEffect, useRef, useState } from 'react';

export const FPSTracker = () => {
  const rafRef = useRef<number | null>(null);

  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());
  const lastFrameRef = useRef(performance.now());

  const smoothedFpsRef = useRef(60);

  const [stats, setStats] = useState({
    fps: 60,
    ms: 16.6,
  });

  useEffect(() => {
    function frame(now: number) {
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;

      const instantFps = 1000 / dt;

      // exponential smoothing
      smoothedFpsRef.current = smoothedFpsRef.current * 0.9 + instantFps * 0.1;

      frameCountRef.current++;

      // only update React 4x/sec
      if (now - lastFpsUpdateRef.current > 250) {
        setStats({
          fps: Math.round(smoothedFpsRef.current),
          ms: Number(dt.toFixed(2)),
        });

        lastFpsUpdateRef.current = now;
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 5,
        left: 5,
        padding: '6px 10px',
        background: 'rgba(0,0,0,0.8)',
        color: '#00ff88',
        fontFamily: 'monospace',
        fontSize: 12,
        borderRadius: 6,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <div>FPS: {stats.fps}</div>
      <div>Frame: {stats.ms} ms</div>
    </div>
  );
};
