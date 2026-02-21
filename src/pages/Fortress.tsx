import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { VideoBackground } from '@/components/VideoBackground';
import { GrainOverlay } from '@/components/GrainOverlay';
import { FortressResourceDistrict, Resources } from '@/components/FortressResourceDistrict';
import { Button } from '@/components/ui/button';
import { VaultDepositModal } from '@/components/modals/VaultDepositModal';
import { useWalletContext } from '@/contexts/WalletContext';
import { usePlayerData } from '@/hooks/usePlayerData';
import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

type Resource = 'ore' | 'gold' | 'diamond' | 'mana';
type Level = 1 | 2 | 3;

/* Production rates per second (mirrors FortressResourceDistrict) */
const PROD_PER_SEC: Record<Resource, number> = {
  ore:     2   / 3600,
  gold:    1.5 / 3600,
  diamond: 0.5 / 3600,
  mana:    0.8 / 3600,
};

/* ─── Page ──────────────────────────────────────────────────────── */
const Fortress = () => {
  const wallet = useWalletContext();
  const player = usePlayerData(wallet?.address ?? null);

  const [modalType, setModalType]   = useState<'deposit' | 'withdraw' | null>(null);
  const [resources, setResources]   = useState<Resources>({ ore: 0, gold: 0, diamond: 0, mana: 0 });
  const [earnedRates, setEarnedRates] = useState<Partial<Record<Resource, number>>>({});

  /* Accumulate resources over time (replaced by real wallet data when available) */
  useEffect(() => {
    const id = setInterval(() => {
      setResources(prev => ({
        ore:     prev.ore     + PROD_PER_SEC.ore,
        gold:    prev.gold    + PROD_PER_SEC.gold,
        diamond: prev.diamond + PROD_PER_SEC.diamond,
        mana:    prev.mana    + PROD_PER_SEC.mana,
      }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleLevelChange = (_resource: Resource, _level: Level) => {
    /* Could trigger a toast / contract call here */
  };

  /* Wallet-derived values */
  const deposited   = wallet?.address && player.totalDeposited > 0
    ? `${player.totalDeposited.toFixed(2)}`
    : '—';
  const yieldEarned = '—'; // TODO: compute from on-chain yield

  const handleTransaction = (token: string, amount: number, txMode: 'deposit' | 'withdraw') => {
    if (txMode === 'deposit') {
      player.recordDeposit(token, amount);
      if (token === 'HBAR') setEarnedRates(prev => ({ ...prev, ore:     (prev.ore     ?? 0) + amount * 100 }));
      if (token === 'ETH')  setEarnedRates(prev => ({ ...prev, diamond: (prev.diamond ?? 0) + amount * 100 }));
    }
    if (txMode === 'withdraw') player.recordWithdraw(token, amount);
  };

  return (
    <div className="h-screen overflow-hidden">
      <VideoBackground />
      <GrainOverlay />
      <Navigation />

      <div
        className="relative z-10 flex gap-4 px-4"
        style={{ height: 'calc(100vh - 1rem)', paddingTop: '5rem' }}
      >
        {/* ── Fortress grid (dominant) ─────────────────────────── */}
        <div
          className="rounded-xl overflow-hidden flex-1"
          style={{
            minWidth: 0,
            minHeight: 0,
            background: '#000',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.8)',
          }}
        >
          <FortressResourceDistrict
            resources={resources}
            onLevelChange={handleLevelChange}
          />
        </div>

        {/* ── Slim sidebar ─────────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex flex-col gap-3 overflow-y-auto pb-4 fortress-sidebar"
          style={{ width: '260px', minHeight: 0 }}
        >
          {/* Wallet metrics */}
          <div className="card-surface rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wide font-medium">Vault</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Deposited</span>
                <span className="font-mono text-sm font-semibold">{deposited}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Yield</span>
                <span className="font-mono text-sm text-primary">{yieldEarned}</span>
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              <Button
                onClick={() => setModalType('deposit')}
                className="w-full btn-cyan-gradient text-xs h-8"
              >
                Deposit
              </Button>
              <Button
                onClick={() => setModalType('withdraw')}
                variant="outline"
                className="w-full text-xs h-8"
              >
                Withdraw
              </Button>
            </div>
          </div>

          {/* Resource counters */}
          <div className="card-surface rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">
              Resources
            </p>
            <div className="space-y-2">
              {(['ore','gold','diamond','mana'] as Resource[]).map(r => (
                <div key={r} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <img
                      src={`/images/resources/${r}logo.png`}
                      alt={r}
                      className="w-5 h-5"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <span className="text-xs capitalize text-muted-foreground">{r}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {earnedRates[r] != null && (
                      <span className="text-[10px] font-mono text-primary">+{earnedRates[r]}/hr</span>
                    )}
                    <span className="font-mono text-xs">{Math.floor(resources[r])}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Match history */}
          <div className="card-surface rounded-xl p-4 flex-1 min-h-0 flex flex-col">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3 border-b border-border pb-2 flex-shrink-0">
              Matches
            </p>
            <div className="flex-1 min-h-0 overflow-y-auto fortress-sidebar">
              <div className="space-y-2">
                {player.matchHistory.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No matches yet</p>
                )}
                {player.matchHistory.map((m) => {
                  const res = m.resources ?? { ore: 0, gold: 0, diamond: 0, mana: 0 };
                  const resItems = [
                    { key: 'ore',     label: 'Ore',     logo: '/images/resources/orelogo.png',     amount: res.ore     },
                    { key: 'gold',    label: 'Gold',    logo: '/images/resources/goldlogo.png',    amount: res.gold    },
                    { key: 'diamond', label: 'Diamond', logo: '/images/resources/diamondlogo.png', amount: res.diamond },
                    { key: 'mana',    label: 'Mana',    logo: '/images/resources/manalogo.png',    amount: res.mana    },
                  ];
                  return (
                    <div key={m.id} className="group border-t border-border first:border-0">
                      {/* Main row: name + result */}
                      <div className="flex items-center justify-between py-1.5 cursor-default">
                        <p className="text-xs font-mono">{m.opponent}</p>
                        <p className={cn('text-xs font-medium', m.result === 'Won' ? 'text-emerald-400' : 'text-muted-foreground')}>
                          {m.result}
                        </p>
                      </div>
                      {/* Inline resource row — revealed on hover */}
                      <div className="hidden group-hover:flex items-center gap-1.5 pb-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{new Date(m.date).toLocaleDateString()}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        {resItems.map(r => (
                          <div key={r.key} className="flex items-center gap-0.5">
                            <img src={r.logo} alt={r.label} className="w-3 h-3 object-contain" />
                            <span className={cn('text-[10px] font-mono', r.amount > 0 ? 'text-emerald-400' : 'text-muted-foreground')}>
                              {r.amount > 0 ? `+${r.amount}` : '0'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalType && (
        <VaultDepositModal
          open={!!modalType}
          onClose={() => setModalType(null)}
          mode={modalType}
          onTransaction={handleTransaction}
          walletBalance={wallet?.balance}
          isHederaTestnet={wallet?.isHederaTestnet}
        />
      )}
    </div>
  );
};

export default Fortress;
