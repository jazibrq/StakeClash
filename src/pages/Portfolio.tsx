import { useState } from 'react';
import { PageLayout } from '@/components/PageLayout';
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

const Portfolio = () => {
  const [modalType, setModalType] = useState<'deposit' | 'withdraw' | 'redeem' | null>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'vault'>('matches');
  const [timeRange, setTimeRange] = useState('1M');

  return (
    <PageLayout>

      <main className="relative z-10 pt-24 pb-12">
        <div className="container mx-auto max-w-6xl px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
            <p className="text-muted-foreground">Your vault performance and activity</p>
          </div>

          {/* Metrics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              label="Total Deposited"
              value="12.50 ETH"
              subValue="≈ $31,250"
              icon={<Wallet className="w-5 h-5" />}
              delay={0}
            />
            <MetricCard
              label="Yield Accrued"
              value="4.28 ETH"
              subValue="All-time"
              trend={{ value: 8.2, positive: true }}
              icon={<TrendingUp className="w-5 h-5" />}
              delay={100}
            />
            <MetricCard
              label="Pending Awards"
              value="2.03 ETH"
              subValue="Ready to redeem"
              icon={<Gift className="w-5 h-5" />}
              delay={200}
            />
            <MetricCard
              label="Redeemed Total"
              value="6.45 ETH"
              subValue="Lifetime"
              icon={<CheckCircle2 className="w-5 h-5" />}
              delay={300}
            />
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Chart & History */}
            <div className="lg:col-span-2 space-y-6">
              {/* Yield Chart */}
              <div className="card-surface p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-semibold">Yield Accrued Over Time</h2>
                    <p className="text-sm text-muted-foreground">Track your earnings growth</p>
                  </div>
                  <div className="flex gap-1 bg-surface-2 p-1 rounded-lg">
                    {timeRanges.map((range) => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={cn(
                          'px-3 py-1.5 text-xs font-medium rounded transition-all',
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

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yieldData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 18%)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(215 15% 55%)"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(215 15% 55%)"
                        fontSize={12}
                        tickFormatter={(v) => `${v} ETH`}
                      />
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
                        activeDot={{ r: 6, fill: 'hsl(185 100% 50%)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Today</p>
                    <p className="font-mono text-sm text-primary">+0.012 ETH</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">This Week</p>
                    <p className="font-mono text-sm text-primary">+0.089 ETH</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">All Time</p>
                    <p className="font-mono text-sm text-primary">+4.28 ETH</p>
                  </div>
                </div>
              </div>

              {/* Activity History */}
              <div className="card-surface p-6">
                {/* Tabs */}
                <div className="flex gap-6 mb-6 border-b border-border relative">
                  {/* Sliding indicator */}
                  <div 
                    className="absolute bottom-0 h-0.5 bg-primary rounded-full shadow-[0_0_10px_hsl(185_100%_50%/0.4)] transition-all duration-300 ease-out"
                    style={{
                      left: activeTab === 'matches' ? 0 : 'calc(50% + 12px)',
                      width: activeTab === 'matches' ? '95px' : '85px',
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

                {/* Match History Table */}
                {activeTab === 'matches' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left">
                          <th className="pb-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                          <th className="pb-3 text-xs font-medium text-muted-foreground uppercase">Opponent</th>
                          <th className="pb-3 text-xs font-medium text-muted-foreground uppercase">Size</th>
                          <th className="pb-3 text-xs font-medium text-muted-foreground uppercase">Result</th>
                          <th className="pb-3 text-xs font-medium text-muted-foreground uppercase text-right">Awards</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchHistory.map((match, i) => (
                          <tr key={i} className="row-hover border-t border-border">
                            <td className="py-3">
                              <span className="text-sm text-muted-foreground">{match.date}</span>
                            </td>
                            <td className="py-3">
                              <span className="font-mono text-sm">{match.opponent}</span>
                            </td>
                            <td className="py-3">
                              <span className="text-sm">{match.size}p</span>
                            </td>
                            <td className="py-3">
                              <span className={cn(
                                'text-sm font-medium',
                                match.result === 'Won' ? 'text-emerald-400' : 'text-muted-foreground'
                              )}>
                                {match.result}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <span className={cn(
                                'font-mono text-sm',
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

                {/* Vault Activity Table */}
                {activeTab === 'vault' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left">
                          <th className="pb-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                          <th className="pb-3 text-xs font-medium text-muted-foreground uppercase">Type</th>
                          <th className="pb-3 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                          <th className="pb-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                          <th className="pb-3 text-xs font-medium text-muted-foreground uppercase text-right">Tx</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vaultActivity.map((activity, i) => (
                          <tr key={i} className="row-hover border-t border-border">
                            <td className="py-3">
                              <span className="text-sm text-muted-foreground">{activity.date}</span>
                            </td>
                            <td className="py-3">
                              <span className={cn(
                                'inline-flex items-center gap-1 text-sm',
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
                            <td className="py-3">
                              <span className="font-mono text-sm">{activity.amount} ETH</span>
                            </td>
                            <td className="py-3">
                              <span className="text-sm text-emerald-400">{activity.status}</span>
                            </td>
                            <td className="py-3 text-right">
                              <span className="font-mono text-xs text-muted-foreground">{activity.tx}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Vault Card & Pending */}
            <div className="space-y-6">
              {/* Vault Card */}
              <div className="card-surface-elevated p-6">
                <h2 className="text-lg font-semibold mb-6">Your Vault</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Vault Balance</span>
                    <span className="font-mono text-lg font-semibold">12.50 ETH</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Yield Earned</span>
                    <span className="font-mono text-lg text-primary">+4.28 ETH</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pending Awards</span>
                    <span className="font-mono text-lg text-amber-400">2.03 ETH</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={() => setModalType('deposit')}
                    className="w-full btn-cyan-gradient"
                  >
                    Deposit
                  </Button>
                  <Button 
                    onClick={() => setModalType('withdraw')}
                    variant="outline"
                    className="w-full btn-outline-glow"
                  >
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

              {/* Pending Awards Card */}
              <div className="card-surface p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold">Pending Awards</h3>
                </div>
                
                <p className="text-3xl font-bold font-mono text-amber-400 mb-2">2.03 ETH</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Ready to be redeemed into your vault balance
                </p>

                {/* Progress visualization */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Pending</span>
                    <span>Redeemed</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                      style={{ width: '24%' }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-400">2.03 ETH</span>
                    <span className="text-muted-foreground">6.45 ETH</span>
                  </div>
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
            </div>
          </div>
        </div>

      </main>



      {/* Transaction Modal */}
      {modalType && (
        <TransactionModal
          open={!!modalType}
          onClose={() => setModalType(null)}
          type={modalType}
          maxAmount={modalType === 'redeem' ? '2.03' : '12.50'}
        />
      )}
    </PageLayout>
  );
};

export default Portfolio;
