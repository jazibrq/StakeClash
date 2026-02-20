import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

// Scheduler backend URL — override with VITE_SCHEDULER_URL in .env if needed
const SCHEDULER_URL = import.meta.env.VITE_SCHEDULER_URL ?? 'http://localhost:3001';

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export const SeasonCountdown = () => {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [active, setActive] = useState(false);

  // Poll /season-status from the scheduler backend every second while active,
  // every 5 s while idle (to detect a newly started season quickly).
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${SCHEDULER_URL}/season-status`);
        if (!res.ok) return;
        const data: { active: boolean; secondsLeft: number } = await res.json();
        setActive(data.active);
        setSecondsLeft(data.active ? Math.max(0, data.secondsLeft) : null);
      } catch {
        // backend not running — show nothing
        setActive(false);
        setSecondsLeft(null);
      }
    };

    fetchStatus();
    // Poll every second so the display ticks smoothly
    interval = setInterval(fetchStatus, 1_000);
    return () => clearInterval(interval);
  }, []);

  if (!active || secondsLeft === null) return null;

  const urgent = secondsLeft <= 10;

  return (
    <div
      className={`
        flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-mono font-semibold
        border transition-colors
        ${urgent
          ? 'border-red-500/60 bg-red-500/10 text-red-400'
          : 'border-primary/40 bg-primary/10 text-primary'}
      `}
    >
      <Timer className={`w-3.5 h-3.5 ${urgent ? 'animate-pulse' : ''}`} />
      <span className="hidden sm:inline text-xs uppercase tracking-wide opacity-70 mr-0.5">
        Season
      </span>
      <span>{formatSeconds(secondsLeft)}</span>
    </div>
  );
};
