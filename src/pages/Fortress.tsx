import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { VideoBackground } from '@/components/VideoBackground';
import { GrainOverlay } from '@/components/GrainOverlay';
import { FortressResourceDistrict, Resources } from '@/components/FortressResourceDistrict';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VaultDepositModal } from '@/components/modals/VaultDepositModal';
import { useWalletContext } from '@/contexts/WalletContext';
import { usePlayerData } from '@/hooks/usePlayerData';
import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

type Resource = 'ore' | 'gold' | 'diamond' | 'mana';
type Level = 1 | 2 | 3;
type VaultAsset = 'ETH' | 'HBAR' | 'USDC';
type UpgradeCost = { resource: Resource; label: string; amount: number };
type FortressState = {
  resources: Resources;
  levels: Record<Resource, Level>;
};

export const SHARED_RESOURCES_KEY = 'stakeclash_resources';

const INITIAL_RESOURCES: Resources = {
  ore: 1000,
  diamond: 276,
  gold: 564,
  mana: 821,
};

const INITIAL_LEVELS: Record<Resource, Level> = {
  ore: 1,
  gold: 1,
  diamond: 1,
  mana: 1,
};

/* Production rates per hour by building level */
const PROD_PER_HOUR: Record<Resource, Record<Level, number>> = {
  ore: {
    1: 2,
    2: 5,
    3: 10,
  },
  gold: {
    1: 1.5,
    2: 3,
    3: 6,
  },
  diamond: {
    1: 0.5,
    2: 1.2,
    3: 2.5,
  },
  mana: {
    1: 0.8,
    2: 2,
    3: 4,
  },
};

/* ─── Page ──────────────────────────────────────────────────────── */
const Fortress = () => {
  const wallet = useWalletContext();
  const player = usePlayerData(wallet?.address ?? null);

  const [modalType, setModalType]   = useState<'deposit' | 'withdraw' | null>(null);
  const [fortressState, setFortressState] = useState<FortressState>(() => {
    try {
      const raw = localStorage.getItem(SHARED_RESOURCES_KEY);
      if (raw) return { resources: JSON.parse(raw), levels: INITIAL_LEVELS };
    } catch { /* ignore */ }
    return { resources: INITIAL_RESOURCES, levels: INITIAL_LEVELS };
  });
  const [earnedRates, setEarnedRates] = useState<Partial<Record<Resource, number>>>({});
  const [selectedAsset, setSelectedAsset] = useState<VaultAsset>('ETH');
  const resources = fortressState.resources;
  const levels = fortressState.levels;

  /* Accumulate resources over time (replaced by real wallet data when available) */
  useEffect(() => {
    const id = setInterval(() => {
      setFortressState(prev => {
        const next: Resources = {
          ore:     prev.resources.ore     + (PROD_PER_HOUR.ore[prev.levels.ore]         / 3600),
          gold:    prev.resources.gold    + (PROD_PER_HOUR.gold[prev.levels.gold]       / 3600),
          diamond: prev.resources.diamond + (PROD_PER_HOUR.diamond[prev.levels.diamond] / 3600),
          mana:    prev.resources.mana    + (PROD_PER_HOUR.mana[prev.levels.mana]       / 3600),
        };
        localStorage.setItem(SHARED_RESOURCES_KEY, JSON.stringify(next));
        return { ...prev, resources: next };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleLevelChange = (resource: Resource, level: Level, costs: UpgradeCost[]) => {
    setFortressState(prev => {
      if (prev.levels[resource] >= level) return prev;

      const canAfford = costs.every((cost) => prev.resources[cost.resource] >= cost.amount);
      if (!canAfford) return prev;

      const nextResources = { ...prev.resources };
      for (const cost of costs) {
        nextResources[cost.resource] = Math.max(0, nextResources[cost.resource] - cost.amount);
      }

      localStorage.setItem(SHARED_RESOURCES_KEY, JSON.stringify(nextResources));
      return {
        resources: nextResources,
        levels: { ...prev.levels, [resource]: level },
      };
    });
  };

  /* Wallet-derived values */
  const assetDeposited = player.vaultBalances[selectedAsset] ?? 0;
  const deposited = wallet?.address
    ? `${assetDeposited.toFixed(selectedAsset === 'USDC' ? 2 : 4)} ${selectedAsset}`
    : '—';
  const totalEconomy = wallet?.address
    ? player.totalDeposited.toFixed(2)
    : '—';

  const handleTransaction = (token: string, amount: number, txMode: 'deposit' | 'withdraw') => {
    if (txMode === 'deposit') {
      player.recordDeposit(token, amount);
      if (token === 'HBAR') setEarnedRates(prev => ({ ...prev, ore:     (prev.ore     ?? 0) + amount * 100 }));
      if (token === 'ETH')  setEarnedRates(prev => ({ ...prev, diamond: (prev.diamond ?? 0) + amount * 100 }));
      if (token === 'USDC') setEarnedRates(prev => ({ ...prev, gold:    (prev.gold    ?? 0) + amount * 50  }));
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
            levels={levels}
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
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Asset</span>
              <Select value={selectedAsset} onValueChange={(value) => setSelectedAsset(value as VaultAsset)}>
                <SelectTrigger className="h-8 text-xs bg-white/[0.03] border-white/10 focus:ring-0">
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-white/10">
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="HBAR">HBAR</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Deposited</span>
                <span className="font-mono text-sm font-semibold">{deposited}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Economy</span>
                <span className="font-mono text-sm text-primary">{totalEconomy}</span>
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              <Button
                onClick={() => setModalType('deposit')}
                className="w-full btn-cyan-gradient text-xs h-8"
              >
                Deposit
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
                      <span className={`text-[10px] font-mono ${
                        r === 'ore'     ? 'text-orange-400' :
                        r === 'gold'    ? 'text-yellow-400' :
                        r === 'diamond' ? 'text-cyan-400'   :
                                          'text-purple-400'
                      }`}>+{earnedRates[r]}/hr</span>
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
