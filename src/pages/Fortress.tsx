import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { VideoBackground } from '@/components/VideoBackground';
import { GrainOverlay } from '@/components/GrainOverlay';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/shared';
import { TransactionModal } from '@/components/modals/TransactionModal';
import {
  Wallet, TrendingUp, Gift, CheckCircle2,
  ArrowUpRight, ArrowDownRight, RefreshCw,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Mock data
const yieldData = [
  { date: 'Jan', yield: 0.5 },
  { date: 'Feb', yield: 1.2 },
  { date: 'Mar', yield: 1.8 },
  { date: 'Apr', yield: 2.1 },
  { date: 'May', yield: 2.9 },
  { date: 'Jun', yield: 3.4 },
  { date: 'Jul', yield: 4.2 },
];

const matchHistory = [
  { date: '2024-01-15', opponent: '0x5e6f...7g8h', size: 4, result: 'Won', awards: '+0.45' },
  { date: '2024-01-14', opponent: '0x9i0j...1k2l', size: 2, result: 'Lost', awards: '-0.00' },
  { date: '2024-01-13', opponent: '0x3m4n...5o6p', size: 8, result: 'Won', awards: '+1.20' },
  { date: '2024-01-12', opponent: '0x7q8r...9s0t', size: 4, result: 'Won', awards: '+0.38' },
  { date: '2024-01-11', opponent: '0x1u2v...3w4x', size: 2, result: 'Lost', awards: '-0.00' },
];

const vaultActivity = [
  { date: '2024-01-15', type: 'Deposit', amount: '+2.00', status: 'Confirmed', tx: '0xabc...123' },
  { date: '2024-01-10', type: 'Redeem', amount: '+0.85', status: 'Confirmed', tx: '0xdef...456' },
  { date: '2024-01-05', type: 'Deposit', amount: '+5.00', status: 'Confirmed', tx: '0xghi...789' },
  { date: '2024-01-01', type: 'Withdraw', amount: '-1.50', status: 'Confirmed', tx: '0xjkl...012' },
];

const timeRanges = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

const CastleSVG = () => (
  <svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xl drop-shadow-2xl">
    <defs>
      <linearGradient id="castle-stone" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#1e2535" />
        <stop offset="100%" stopColor="#111520" />
      </linearGradient>
      <linearGradient id="castle-stone-dark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#161b28" />
        <stop offset="100%" stopColor="#0d1017" />
      </linearGradient>
      <radialGradient id="castle-ground-glow" cx="50%" cy="100%" r="50%">
        <stop offset="0%" stopColor="hsl(185,100%,50%)" stopOpacity="0.12" />
        <stop offset="100%" stopColor="hsl(185,100%,50%)" stopOpacity="0" />
      </radialGradient>
      <filter id="castle-window-glow">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="flag-glow">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Ground glow */}
    <ellipse cx="250" cy="420" rx="240" ry="30" fill="url(#castle-ground-glow)" />

    {/* === LEFT TOWER === */}
    <rect x="10" y="100" width="115" height="320" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    {/* Left tower battlements */}
    <rect x="12" y="78" width="18" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    <rect x="38" y="78" width="18" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    <rect x="64" y="78" width="18" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    <rect x="90" y="78" width="18" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    {/* Left tower windows (arched) */}
    <rect x="46" y="145" width="20" height="32" rx="10" fill="#060810" />
    <rect x="46" y="145" width="20" height="32" rx="10" fill="hsl(185,100%,50%)" opacity="0.09" filter="url(#castle-window-glow)" />
    <rect x="46" y="207" width="20" height="32" rx="10" fill="#060810" />
    <rect x="46" y="207" width="20" height="32" rx="10" fill="hsl(185,100%,50%)" opacity="0.09" filter="url(#castle-window-glow)" />
    <rect x="46" y="269" width="20" height="32" rx="10" fill="#060810" />
    <rect x="46" y="269" width="20" height="32" rx="10" fill="hsl(185,100%,50%)" opacity="0.09" filter="url(#castle-window-glow)" />
    <rect x="46" y="331" width="20" height="32" rx="10" fill="#060810" />
    <rect x="46" y="331" width="20" height="32" rx="10" fill="hsl(185,100%,50%)" opacity="0.06" />
    {/* Left tower stone courses */}
    <line x1="10" y1="170" x2="125" y2="170" stroke="#1e2535" strokeWidth="0.8" opacity="0.5" />
    <line x1="10" y1="245" x2="125" y2="245" stroke="#1e2535" strokeWidth="0.8" opacity="0.5" />
    <line x1="10" y1="320" x2="125" y2="320" stroke="#1e2535" strokeWidth="0.8" opacity="0.5" />

    {/* === RIGHT TOWER === */}
    <rect x="375" y="100" width="115" height="320" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    {/* Right tower battlements */}
    <rect x="377" y="78" width="18" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    <rect x="403" y="78" width="18" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    <rect x="429" y="78" width="18" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    <rect x="455" y="78" width="18" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    {/* Right tower windows */}
    <rect x="434" y="145" width="20" height="32" rx="10" fill="#060810" />
    <rect x="434" y="145" width="20" height="32" rx="10" fill="hsl(185,100%,50%)" opacity="0.09" filter="url(#castle-window-glow)" />
    <rect x="434" y="207" width="20" height="32" rx="10" fill="#060810" />
    <rect x="434" y="207" width="20" height="32" rx="10" fill="hsl(185,100%,50%)" opacity="0.09" filter="url(#castle-window-glow)" />
    <rect x="434" y="269" width="20" height="32" rx="10" fill="#060810" />
    <rect x="434" y="269" width="20" height="32" rx="10" fill="hsl(185,100%,50%)" opacity="0.09" filter="url(#castle-window-glow)" />
    <rect x="434" y="331" width="20" height="32" rx="10" fill="#060810" />
    <rect x="434" y="331" width="20" height="32" rx="10" fill="hsl(185,100%,50%)" opacity="0.06" />
    {/* Right tower stone courses */}
    <line x1="375" y1="170" x2="490" y2="170" stroke="#1e2535" strokeWidth="0.8" opacity="0.5" />
    <line x1="375" y1="245" x2="490" y2="245" stroke="#1e2535" strokeWidth="0.8" opacity="0.5" />
    <line x1="375" y1="320" x2="490" y2="320" stroke="#1e2535" strokeWidth="0.8" opacity="0.5" />

    {/* === CENTER KEEP === */}
    <rect x="125" y="165" width="250" height="255" fill="url(#castle-stone-dark)" stroke="#252b3b" strokeWidth="1.5" />
    {/* Center battlements */}
    <rect x="128" y="143" width="20" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    <rect x="160" y="143" width="20" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    <rect x="192" y="143" width="20" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    <rect x="224" y="143" width="20" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    <rect x="256" y="143" width="20" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    <rect x="288" y="143" width="20" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    <rect x="320" y="143" width="20" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />
    <rect x="352" y="143" width="20" height="26" fill="url(#castle-stone)" stroke="#252b3b" strokeWidth="1.5" />

    {/* Center keep windows */}
    <rect x="163" y="198" width="24" height="38" rx="12" fill="#060810" />
    <rect x="163" y="198" width="24" height="38" rx="12" fill="hsl(185,100%,50%)" opacity="0.1" filter="url(#castle-window-glow)" />
    <rect x="313" y="198" width="24" height="38" rx="12" fill="#060810" />
    <rect x="313" y="198" width="24" height="38" rx="12" fill="hsl(185,100%,50%)" opacity="0.1" filter="url(#castle-window-glow)" />

    {/* Center keep stone courses */}
    <line x1="125" y1="240" x2="375" y2="240" stroke="#1e2535" strokeWidth="0.8" opacity="0.5" />
    <line x1="125" y1="315" x2="375" y2="315" stroke="#1e2535" strokeWidth="0.8" opacity="0.5" />

    {/* === GATE (gothic arch) === */}
    <path
      d="M 215 420 L 215 320 Q 215 278 250 278 Q 285 278 285 320 L 285 420 Z"
      fill="#040608"
    />
    {/* Gate glow inner */}
    <path
      d="M 217 420 L 217 321 Q 217 282 250 282 Q 283 282 283 321 L 283 420 Z"
      fill="hsl(185,100%,50%)"
      opacity="0.015"
    />
    {/* Portcullis vertical bars */}
    <line x1="225" y1="320" x2="225" y2="420" stroke="#1c2436" strokeWidth="3.5" />
    <line x1="240" y1="320" x2="240" y2="420" stroke="#1c2436" strokeWidth="3.5" />
    <line x1="250" y1="320" x2="250" y2="420" stroke="#1c2436" strokeWidth="3.5" />
    <line x1="260" y1="320" x2="260" y2="420" stroke="#1c2436" strokeWidth="3.5" />
    <line x1="275" y1="320" x2="275" y2="420" stroke="#1c2436" strokeWidth="3.5" />
    {/* Portcullis horizontal bars */}
    <line x1="215" y1="348" x2="285" y2="348" stroke="#1c2436" strokeWidth="2.5" />
    <line x1="215" y1="380" x2="285" y2="380" stroke="#1c2436" strokeWidth="2.5" />

    {/* === FLAGS === */}
    {/* Left tower flag */}
    <line x1="75" y1="78" x2="75" y2="36" stroke="hsl(185,100%,50%)" strokeWidth="2" opacity="0.85" filter="url(#flag-glow)" />
    <polygon points="75,36 100,46 75,56" fill="hsl(185,100%,50%)" opacity="0.85" filter="url(#flag-glow)" />
    {/* Right tower flag */}
    <line x1="432" y1="78" x2="432" y2="36" stroke="hsl(185,100%,50%)" strokeWidth="2" opacity="0.85" filter="url(#flag-glow)" />
    <polygon points="432,36 457,46 432,56" fill="hsl(185,100%,50%)" opacity="0.85" filter="url(#flag-glow)" />
    {/* Center keep flag */}
    <line x1="250" y1="143" x2="250" y2="96" stroke="hsl(185,100%,50%)" strokeWidth="2.5" opacity="0.95" filter="url(#flag-glow)" />
    <polygon points="250,96 280,108 250,120" fill="hsl(185,100%,50%)" opacity="0.95" filter="url(#flag-glow)" />

    {/* Ground shadow */}
    <ellipse cx="250" cy="420" rx="235" ry="6" fill="black" opacity="0.5" />
  </svg>
);

const Fortress = () => {
  const [modalType, setModalType] = useState<'deposit' | 'withdraw' | 'redeem' | null>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'vault'>('matches');
  const [timeRange, setTimeRange] = useState('1M');

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <VideoBackground />
      <GrainOverlay />
      <Navigation />

      {/* Two-column layout: castle left, portfolio sidebar right */}
      <div className="flex flex-1 pt-24 overflow-hidden relative z-10">

        {/* Left / Center — Castle */}
        <div className="flex-1 flex items-center justify-center px-8 relative">
          {/* Subtle radial glow behind castle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-[60%] h-[60%] rounded-full"
              style={{
                background: 'radial-gradient(ellipse at center, hsl(185 100% 50% / 0.04) 0%, transparent 70%)',
              }}
            />
          </div>
          <CastleSVG />
        </div>

        {/* Right Sidebar — Portfolio (scrollable) */}
        <div
          className="w-[400px] xl:w-[440px] overflow-y-auto border-l"
          style={{ borderColor: 'hsl(220 15% 18% / 0.6)', background: 'hsl(220 25% 5% / 0.7)', backdropFilter: 'blur(12px)' }}
        >
          <div className="p-6 space-y-6">

            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold mb-1">Fortress</h1>
              <p className="text-muted-foreground text-sm">Your vault performance and activity</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Total Deposited"
                value="12.50 ETH"
                subValue="≈ $31,250"
                icon={<Wallet className="w-4 h-4" />}
                delay={0}
              />
              <MetricCard
                label="Yield Accrued"
                value="4.28 ETH"
                subValue="All-time"
                trend={{ value: 8.2, positive: true }}
                icon={<TrendingUp className="w-4 h-4" />}
                delay={100}
              />
              <MetricCard
                label="Pending Awards"
                value="2.03 ETH"
                subValue="Ready to redeem"
                icon={<Gift className="w-4 h-4" />}
                delay={200}
              />
              <MetricCard
                label="Redeemed Total"
                value="6.45 ETH"
                subValue="Lifetime"
                icon={<CheckCircle2 className="w-4 h-4" />}
                delay={300}
              />
            </div>

            {/* Vault Card */}
            <div className="card-surface-elevated p-5">
              <h2 className="text-base font-semibold mb-4">Your Vault</h2>
              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Vault Balance</span>
                  <span className="font-mono text-base font-semibold">12.50 ETH</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Yield Earned</span>
                  <span className="font-mono text-base text-primary">+4.28 ETH</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending Awards</span>
                  <span className="font-mono text-base text-amber-400">2.03 ETH</span>
                </div>
              </div>
              <div className="space-y-2">
                <Button onClick={() => setModalType('deposit')} className="w-full btn-cyan-gradient">
                  Deposit
                </Button>
                <Button onClick={() => setModalType('withdraw')} variant="outline" className="w-full btn-outline-glow">
                  Withdraw
                </Button>
                <Button
                  onClick={() => setModalType('redeem')}
                  variant="outline"
                  className="w-full border-amber-500/30 text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/10"
                >
                  Redeem Pending Awards
                </Button>
              </div>
            </div>

            {/* APY Info */}
            <div className="card-surface p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Current APY</p>
                  <p className="text-xs text-muted-foreground">~8% baseline yield</p>
                </div>
                <span className="ml-auto font-mono text-lg text-primary">8.2%</span>
              </div>
            </div>

            {/* Pending Awards Card */}
            <div className="card-surface p-5">
              <div className="flex items-center gap-2 mb-4">
                <Gift className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold">Pending Awards</h3>
              </div>
              <p className="text-3xl font-bold font-mono text-amber-400 mb-1">2.03 ETH</p>
              <p className="text-sm text-muted-foreground mb-4">Ready to be redeemed</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Pending</span>
                  <span>Redeemed</span>
                </div>
                <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" style={{ width: '24%' }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-400">2.03 ETH</span>
                  <span className="text-muted-foreground">6.45 ETH</span>
                </div>
              </div>
            </div>

            {/* Yield Chart */}
            <div className="card-surface p-5">
              <div className="flex flex-col gap-3 mb-4">
                <div>
                  <h2 className="text-base font-semibold">Yield Over Time</h2>
                  <p className="text-xs text-muted-foreground">Track your earnings growth</p>
                </div>
                <div className="flex gap-1 bg-surface-2 p-1 rounded-lg self-start">
                  {timeRanges.map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={cn(
                        'px-2 py-1 text-xs font-medium rounded transition-all',
                        timeRange === range
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yieldData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 18%)" />
                    <XAxis dataKey="date" stroke="hsl(215 15% 55%)" fontSize={11} />
                    <YAxis stroke="hsl(215 15% 55%)" fontSize={11} tickFormatter={(v) => `${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(220 20% 8%)',
                        border: '1px solid hsl(220 15% 18%)',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(210 20% 98%)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="yield"
                      stroke="hsl(185 100% 50%)"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(185 100% 50%)', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: 'hsl(185 100% 50%)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Today</p>
                  <p className="font-mono text-xs text-primary">+0.012 ETH</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">This Week</p>
                  <p className="font-mono text-xs text-primary">+0.089 ETH</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">All Time</p>
                  <p className="font-mono text-xs text-primary">+4.28 ETH</p>
                </div>
              </div>
            </div>

            {/* Activity History */}
            <div className="card-surface p-5">
              {/* Tabs */}
              <div className="flex gap-6 mb-5 border-b border-border relative">
                <div
                  className="absolute bottom-0 h-0.5 bg-primary rounded-full shadow-[0_0_10px_hsl(185_100%_50%/0.4)] transition-all duration-300 ease-out"
                  style={{
                    left: activeTab === 'matches' ? 0 : 'calc(50% + 12px)',
                    width: activeTab === 'matches' ? '90px' : '80px',
                  }}
                />
                <button
                  onClick={() => setActiveTab('matches')}
                  className={cn(
                    'pb-3 text-sm font-medium transition-colors duration-200',
                    activeTab === 'matches' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Match History
                </button>
                <button
                  onClick={() => setActiveTab('vault')}
                  className={cn(
                    'pb-3 text-sm font-medium transition-colors duration-200',
                    activeTab === 'vault' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Vault Activity
                </button>
              </div>

              {activeTab === 'matches' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left">
                        <th className="pb-2 text-xs font-medium text-muted-foreground uppercase">Date</th>
                        <th className="pb-2 text-xs font-medium text-muted-foreground uppercase">Opponent</th>
                        <th className="pb-2 text-xs font-medium text-muted-foreground uppercase">Result</th>
                        <th className="pb-2 text-xs font-medium text-muted-foreground uppercase text-right">Awards</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchHistory.map((match, i) => (
                        <tr key={i} className="row-hover border-t border-border">
                          <td className="py-2.5">
                            <span className="text-xs text-muted-foreground">{match.date}</span>
                          </td>
                          <td className="py-2.5">
                            <span className="font-mono text-xs">{match.opponent}</span>
                          </td>
                          <td className="py-2.5">
                            <span className={cn(
                              'text-xs font-medium',
                              match.result === 'Won' ? 'text-emerald-400' : 'text-muted-foreground'
                            )}>
                              {match.result}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <span className={cn(
                              'font-mono text-xs',
                              match.awards.startsWith('+') ? 'text-primary' : 'text-muted-foreground'
                            )}>
                              {match.awards} ETH
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'vault' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left">
                        <th className="pb-2 text-xs font-medium text-muted-foreground uppercase">Date</th>
                        <th className="pb-2 text-xs font-medium text-muted-foreground uppercase">Type</th>
                        <th className="pb-2 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                        <th className="pb-2 text-xs font-medium text-muted-foreground uppercase text-right">Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vaultActivity.map((activity, i) => (
                        <tr key={i} className="row-hover border-t border-border">
                          <td className="py-2.5">
                            <span className="text-xs text-muted-foreground">{activity.date}</span>
                          </td>
                          <td className="py-2.5">
                            <span className={cn(
                              'inline-flex items-center gap-1 text-xs',
                              activity.type === 'Deposit' && 'text-primary',
                              activity.type === 'Withdraw' && 'text-muted-foreground',
                              activity.type === 'Redeem' && 'text-amber-400'
                            )}>
                              {activity.type === 'Deposit' && <ArrowUpRight className="w-3 h-3" />}
                              {activity.type === 'Withdraw' && <ArrowDownRight className="w-3 h-3" />}
                              {activity.type === 'Redeem' && <RefreshCw className="w-3 h-3" />}
                              {activity.type}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span className="font-mono text-xs">{activity.amount} ETH</span>
                          </td>
                          <td className="py-2.5 text-right">
                            <span className="font-mono text-xs text-muted-foreground">{activity.tx}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom padding */}
            <div className="h-4" />
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      {modalType && (
        <TransactionModal
          open={!!modalType}
          onClose={() => setModalType(null)}
          type={modalType}
          maxAmount={modalType === 'redeem' ? '2.03' : '12.50'}
        />
      )}
    </div>
  );
};

export default Fortress;
