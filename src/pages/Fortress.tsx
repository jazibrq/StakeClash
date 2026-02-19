import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { VideoBackground } from '@/components/VideoBackground';
import { GrainOverlay } from '@/components/GrainOverlay';
import { FortressResourceDistrict, Resources } from '@/components/FortressResourceDistrict';
import { Button } from '@/components/ui/button';
import { TransactionModal } from '@/components/modals/TransactionModal';
import { useWalletContext } from '@/contexts/WalletContext';
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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

const matchHistory = [
  { date: '2024-01-15', opponent: '0x5e6f...7g8h', size: 4,  result: 'Won',  awards: '+0.45' },
  { date: '2024-01-14', opponent: '0x9i0j...1k2l', size: 2,  result: 'Lost', awards: '-0.00' },
  { date: '2024-01-13', opponent: '0x3m4n...5o6p', size: 8,  result: 'Won',  awards: '+1.20' },
  { date: '2024-01-12', opponent: '0x7q8r...9s0t', size: 4,  result: 'Won',  awards: '+0.38' },
  { date: '2024-01-11', opponent: '0x1u2v...3w4x', size: 2,  result: 'Lost', awards: '-0.00' },
];

const vaultActivity = [
  { date: '2024-01-15', type: 'Deposit',  amount: '+2.00', tx: '0xabc...123' },
  { date: '2024-01-10', type: 'Withdraw', amount: '-0.85', tx: '0xdef...456' },
  { date: '2024-01-05', type: 'Deposit',  amount: '+5.00', tx: '0xghi...789' },
];

/* ─── Page ──────────────────────────────────────────────────────── */
const Fortress = () => {
  const wallet = useWalletContext();

  const [modalType, setModalType]   = useState<'deposit' | 'withdraw' | null>(null);
  const [activeTab, setActiveTab]   = useState<'matches' | 'vault'>('matches');
  const [resources, setResources]   = useState<Resources>({ ore: 0, gold: 0, diamond: 0, mana: 0 });

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

  /* Mock wallet-derived values (swap for real contract reads) */
  const deposited  = wallet?.address ? '12.50 ETH' : '—';
  const yieldEarned = wallet?.address ? '4.28 ETH'  : '—';

  return (
    <div className="h-screen overflow-hidden">
      <VideoBackground />
      <GrainOverlay />
      <Navigation />

      <div
        className="relative z-10 flex gap-4 px-4 pb-2"
        style={{ height: 'calc(100vh - 3.5rem)', paddingTop: '5rem' }}
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
                  <span className="font-mono text-xs">{Math.floor(resources[r])}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity tabs */}
          <div className="card-surface rounded-xl p-4 flex-1 min-h-0 flex flex-col">
            <div className="flex gap-4 mb-3 border-b border-border pb-2 flex-shrink-0">
              {(['matches', 'vault'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'text-xs font-medium uppercase tracking-wide transition-colors',
                    activeTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab === 'matches' ? 'Matches' : 'Vault'}
                </button>
              ))}
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 min-h-0 overflow-y-auto fortress-sidebar">
              {activeTab === 'matches' && (
                <div className="space-y-2">
                  {matchHistory.map((m, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-t border-border first:border-0">
                      <div>
                        <p className="text-xs font-mono">{m.opponent}</p>
                        <p className="text-xs text-muted-foreground">{m.date} · {m.size}p</p>
                      </div>
                      <div className="text-right">
                        <p className={cn('text-xs font-medium', m.result === 'Won' ? 'text-emerald-400' : 'text-muted-foreground')}>
                          {m.result}
                        </p>
                        <p className={cn('text-xs font-mono', m.awards.startsWith('+') ? 'text-primary' : 'text-muted-foreground')}>
                          {m.awards}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'vault' && (
                <div className="space-y-2">
                  {vaultActivity.map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-t border-border first:border-0">
                      <div className="flex items-center gap-1.5">
                        {a.type === 'Deposit'
                          ? <ArrowUpRight className="w-3 h-3 text-primary" />
                          : <ArrowDownRight className="w-3 h-3 text-muted-foreground" />}
                        <div>
                          <p className="text-xs font-medium">{a.type}</p>
                          <p className="text-xs text-muted-foreground font-mono">{a.tx}</p>
                        </div>
                      </div>
                      <p className={cn('text-xs font-mono', a.amount.startsWith('+') ? 'text-primary' : 'text-muted-foreground')}>
                        {a.amount}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {modalType && (
        <TransactionModal
          open={!!modalType}
          onClose={() => setModalType(null)}
          type={modalType}
          maxAmount="12.50"
        />
      )}
    </div>
  );
};

export default Fortress;
