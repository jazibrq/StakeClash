import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { VideoBackground } from '@/components/VideoBackground';
import { GrainOverlay } from '@/components/GrainOverlay';
import { FortressResourceDistrict } from '@/components/FortressResourceDistrict';
import { Button } from '@/components/ui/button';
import { TransactionModal } from '@/components/modals/TransactionModal';
import {
  Wallet, TrendingUp, Gift, CheckCircle2,
  ArrowUpRight, ArrowDownRight, RefreshCw, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ─── Mock data ─────────────────────────────────────────────────── */
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
  { date: '2024-01-15', opponent: '0x5e6f...7g8h', size: 4, result: 'Won',  awards: '+0.45' },
  { date: '2024-01-14', opponent: '0x9i0j...1k2l', size: 2, result: 'Lost', awards: '-0.00' },
  { date: '2024-01-13', opponent: '0x3m4n...5o6p', size: 8, result: 'Won',  awards: '+1.20' },
  { date: '2024-01-12', opponent: '0x7q8r...9s0t', size: 4, result: 'Won',  awards: '+0.38' },
  { date: '2024-01-11', opponent: '0x1u2v...3w4x', size: 2, result: 'Lost', awards: '-0.00' },
];

const vaultActivity = [
  { date: '2024-01-15', type: 'Deposit',  amount: '+2.00', status: 'Confirmed', tx: '0xabc...123' },
  { date: '2024-01-10', type: 'Redeem',   amount: '+0.85', status: 'Confirmed', tx: '0xdef...456' },
  { date: '2024-01-05', type: 'Deposit',  amount: '+5.00', status: 'Confirmed', tx: '0xghi...789' },
  { date: '2024-01-01', type: 'Withdraw', amount: '-1.50', status: 'Confirmed', tx: '0xjkl...012' },
];

const timeRanges = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

/* ─── Page ──────────────────────────────────────────────────────── */
const Fortress = () => {
  const [modalType, setModalType] = useState<'deposit' | 'withdraw' | 'redeem' | null>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'vault'>('matches');
  const [timeRange, setTimeRange] = useState('1M');

  return (
    <div className="h-screen overflow-hidden">
      <VideoBackground />
      <GrainOverlay />
      <Navigation />

      {/* Full-height layout below nav */}
      <div
        className="relative z-10 flex gap-5 px-6"
        style={{ height: 'calc(100vh - 6rem)', paddingTop: '6rem' }}
      >
        {/* ── Left: square video grid ───────────────────────────── */}
        <div
          className="flex-shrink-0 rounded-2xl overflow-hidden"
          style={{
            height: '100%',
            aspectRatio: '1 / 1',
            background: '#000',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.8)',
          }}
        >
          <FortressResourceDistrict />
        </div>

        {/* ── Right: portfolio sidebar ──────────────────────────── */}
        <div className="flex-1 overflow-y-auto pb-6 space-y-4 min-w-0">

          {/* Metric strip */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Deposited', value: '12.50 ETH', sub: '≈ $31,250',  icon: <Wallet className="w-4 h-4" /> },
              { label: 'Yield',     value: '4.28 ETH',  sub: 'All-time',   icon: <TrendingUp className="w-4 h-4" /> },
              { label: 'Pending',   value: '2.03 ETH',  sub: 'Redeem now', icon: <Gift className="w-4 h-4" /> },
              { label: 'Redeemed',  value: '6.45 ETH',  sub: 'Lifetime',   icon: <CheckCircle2 className="w-4 h-4" /> },
            ].map((m) => (
              <div key={m.label} className="card-surface rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  {m.icon}
                  <span className="text-xs uppercase tracking-wide">{m.label}</span>
                </div>
                <p className="font-mono font-semibold text-base">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Vault card */}
          <div className="card-surface rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-4">Your Vault</h2>
            <div className="space-y-3 mb-5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Balance</span>
                <span className="font-mono font-semibold">12.50 ETH</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Yield Earned</span>
                <span className="font-mono text-primary">+4.28 ETH</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="font-mono text-amber-400">2.03 ETH</span>
              </div>
            </div>
            <div className="space-y-2">
              <Button onClick={() => setModalType('deposit')} className="w-full btn-cyan-gradient text-sm h-9">
                Deposit
              </Button>
              <Button onClick={() => setModalType('withdraw')} variant="outline" className="w-full btn-outline-glow text-sm h-9">
                Withdraw
              </Button>
              <Button
                onClick={() => setModalType('redeem')}
                variant="outline"
                className="w-full text-sm h-9 border-amber-500/30 text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/10"
              >
                Redeem Awards
              </Button>
            </div>
          </div>

          {/* APY */}
          <div className="card-surface rounded-xl p-4 flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Current APY</p>
              <p className="text-xs text-muted-foreground">~8% baseline yield</p>
            </div>
            <span className="font-mono text-lg text-primary">8.2%</span>
          </div>

          {/* Yield chart */}
          <div className="card-surface rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide">Yield Over Time</h2>
              <div className="flex gap-1 bg-black/40 p-0.5 rounded-md">
                {timeRanges.map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={cn(
                      'px-2 py-1 text-xs rounded transition-all',
                      timeRange === r ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yieldData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 14%)" />
                  <XAxis dataKey="date" stroke="hsl(215 15% 45%)" fontSize={11} />
                  <YAxis stroke="hsl(215 15% 45%)" fontSize={11} tickFormatter={(v) => `${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      border: '1px solid #1F2937',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f9fafb' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="yield"
                    stroke="hsl(0 84% 60%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(0 84% 60%)', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: 'hsl(0 84% 60%)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
              {[['Today', '+0.012 ETH'], ['This Week', '+0.089 ETH'], ['All Time', '+4.28 ETH']].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                  <p className="font-mono text-sm text-primary">{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Activity tabs */}
          <div className="card-surface rounded-xl p-5">
            <div className="flex gap-5 mb-4 border-b border-border relative">
              <div
                className="absolute bottom-0 h-0.5 bg-primary rounded-full transition-all duration-300 ease-out"
                style={{
                  left: activeTab === 'matches' ? 0 : 'calc(50% + 8px)',
                  width: activeTab === 'matches' ? '90px' : '80px',
                }}
              />
              {(['matches', 'vault'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'pb-3 text-xs font-medium uppercase tracking-wide transition-colors',
                    activeTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab === 'matches' ? 'Match History' : 'Vault Activity'}
                </button>
              ))}
            </div>

            {activeTab === 'matches' && (
              <table className="w-full">
                <thead>
                  <tr>
                    {['Date', 'Opponent', 'Size', 'Result', 'Awards'].map((h, i) => (
                      <th key={h} className={cn('pb-2 text-xs font-medium text-muted-foreground uppercase', i === 4 && 'text-right')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matchHistory.map((m, i) => (
                    <tr key={i} className="row-hover border-t border-border">
                      <td className="py-2 text-xs text-muted-foreground">{m.date}</td>
                      <td className="py-2 font-mono text-xs">{m.opponent}</td>
                      <td className="py-2 text-xs">{m.size}p</td>
                      <td className={cn('py-2 text-xs font-medium', m.result === 'Won' ? 'text-emerald-400' : 'text-muted-foreground')}>
                        {m.result}
                      </td>
                      <td className={cn('py-2 text-right font-mono text-xs', m.awards.startsWith('+') ? 'text-primary' : 'text-muted-foreground')}>
                        {m.awards} ETH
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'vault' && (
              <table className="w-full">
                <thead>
                  <tr>
                    {['Date', 'Type', 'Amount', 'Status', 'Tx'].map((h, i) => (
                      <th key={h} className={cn('pb-2 text-xs font-medium text-muted-foreground uppercase', i === 4 && 'text-right')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vaultActivity.map((a, i) => (
                    <tr key={i} className="row-hover border-t border-border">
                      <td className="py-2 text-xs text-muted-foreground">{a.date}</td>
                      <td className="py-2">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-xs',
                          a.type === 'Deposit' && 'text-primary',
                          a.type === 'Withdraw' && 'text-muted-foreground',
                          a.type === 'Redeem' && 'text-amber-400',
                        )}>
                          {a.type === 'Deposit'  && <ArrowUpRight className="w-3 h-3" />}
                          {a.type === 'Withdraw' && <ArrowDownRight className="w-3 h-3" />}
                          {a.type === 'Redeem'   && <RefreshCw className="w-3 h-3" />}
                          {a.type}
                        </span>
                      </td>
                      <td className="py-2 font-mono text-xs">{a.amount} ETH</td>
                      <td className="py-2 text-xs text-emerald-400">{a.status}</td>
                      <td className="py-2 text-right font-mono text-xs text-muted-foreground">{a.tx}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pending awards */}
          <div className="card-surface rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Pending Awards</h3>
            </div>
            <p className="text-2xl font-bold font-mono text-amber-400 mb-1">2.03 ETH</p>
            <p className="text-xs text-muted-foreground mb-4">Ready to redeem into vault balance</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pending</span><span>Redeemed</span>
              </div>
              <div className="h-1.5 rounded-full bg-black overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: '24%' }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-amber-400">2.03 ETH</span>
                <span className="text-muted-foreground">6.45 ETH</span>
              </div>
            </div>
          </div>

        </div>
      </div>

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
