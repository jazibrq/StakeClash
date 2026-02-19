import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, TrendingUp, Trophy } from 'lucide-react';

export const ModelVisualizer = () => {
  const [depositAmount, setDepositAmount] = useState([5]);
  const [timeStaked, setTimeStaked] = useState([30]);
  const [lobbySize, setLobbySize] = useState('4');

  // Mock calculations
  const estimatedYield = (depositAmount[0] * (timeStaked[0] / 365) * 0.08).toFixed(3);
  const potentialAwards = (timeStaked[0] * 0.15 * depositAmount[0] * 0.1 / parseInt(lobbySize)).toFixed(3);

  return (
    <section className="py-20">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Model Visualizer</h2>
          <p className="text-muted-foreground">See how your strategy could perform</p>
        </div>

        <div className="card-surface-elevated p-6 sm:p-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Flow Diagram */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">The SkillStack Flow</h3>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="px-3 py-1.5 rounded-lg bg-surface-2 text-foreground">Deposit</span>
                <ArrowRight className="w-4 h-4 text-primary" />
                <span className="px-3 py-1.5 rounded-lg bg-surface-2 text-foreground">Yield</span>
                <ArrowRight className="w-4 h-4 text-primary" />
                <span className="px-3 py-1.5 rounded-lg bg-surface-2 text-foreground">Play</span>
                <ArrowRight className="w-4 h-4 text-primary" />
                <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400">Pending</span>
                <ArrowRight className="w-4 h-4 text-primary" />
                <span className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary">Redeem</span>
              </div>

              {/* Controls */}
              <div className="space-y-6 pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <label className="text-muted-foreground">Deposit Amount</label>
                    <span className="font-mono text-primary">{depositAmount[0]} ETH</span>
                  </div>
                  <Slider
                    value={depositAmount}
                    onValueChange={setDepositAmount}
                    max={20}
                    min={0.1}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <label className="text-muted-foreground">Time Staked</label>
                    <span className="font-mono text-primary">{timeStaked[0]} days</span>
                  </div>
                  <Slider
                    value={timeStaked}
                    onValueChange={setTimeStaked}
                    max={365}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <label className="text-muted-foreground">Lobby Size</label>
                    <span className="font-mono text-primary">{lobbySize} players</span>
                  </div>
                  <Select value={lobbySize} onValueChange={setLobbySize}>
                    <SelectTrigger className="w-full bg-surface-2 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-2 border-border">
                      <SelectItem value="2">2 Players</SelectItem>
                      <SelectItem value="4">4 Players</SelectItem>
                      <SelectItem value="8">8 Players</SelectItem>
                      <SelectItem value="16">16 Players</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Right: Outputs */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Projected Outcomes</h3>
              
              <div className="card-surface p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label mb-1">Estimated Yield Accrued</p>
                    <p className="metric-value text-gradient-cyan">{estimatedYield} ETH</p>
                    <p className="text-xs text-muted-foreground mt-1">~8% APY baseline</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </div>

              <div className="card-surface p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label mb-1">Potential Pending Awards</p>
                    <p className="metric-value text-amber-400">{potentialAwards} ETH</p>
                    <p className="text-xs text-muted-foreground mt-1">Assuming 1 win/day</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
