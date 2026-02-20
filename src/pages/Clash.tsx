import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoBackground } from '@/components/VideoBackground';
import { GrainOverlay } from '@/components/GrainOverlay';
import { Navigation } from '@/components/Navigation';
import RaidGame from '@/components/RaidGame';

type Phase = 'search' | 'playing';

const Clash = () => {
  const [phase, setPhase] = useState<Phase>('search');
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleSearch = useCallback(() => {
    setPhase('playing');
    /* Request browser fullscreen after the game div mounts */
    setTimeout(() => {
      containerRef.current?.requestFullscreen().catch(() => {/* ok — game is still visually full-screen via CSS */});
    }, 50);
  }, []);

  const handleReturn = useCallback(() => {
    const exit = document.fullscreenElement
      ? document.exitFullscreen()
      : Promise.resolve();
    exit.finally(() => navigate('/'));
  }, [navigate]);

  return (
    <div style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Ambient background always visible */}
      <VideoBackground />
      <GrainOverlay />
      <Navigation />

      {/* ── Search phase: just the button ── */}
      {phase === 'search' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}>
          <button
            onClick={handleSearch}
            style={{
              padding: '22px 72px',
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              border: 'none', borderRadius: '10px',
              color: '#fff', fontSize: '15px',
              fontWeight: 800, letterSpacing: '4px',
              cursor: 'pointer', fontFamily: 'monospace',
              boxShadow: '0 0 60px rgba(239,68,68,0.40), 0 6px 28px rgba(0,0,0,0.7)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.06)';
              e.currentTarget.style.boxShadow = '0 0 90px rgba(239,68,68,0.65), 0 6px 28px rgba(0,0,0,0.7)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 0 60px rgba(239,68,68,0.40), 0 6px 28px rgba(0,0,0,0.7)';
            }}
          >
            SEARCH FOR CLASH
          </button>
        </div>
      )}

      {/* ── Playing phase: fullscreen game ── */}
      {phase === 'playing' && (
        <div
          ref={containerRef}
          style={{
            position: 'fixed', inset: 0,
            zIndex: 100, background: '#000',
          }}
        >
          <RaidGame autoStart onReturn={handleReturn} />
        </div>
      )}
    </div>
  );
};

export default Clash;
