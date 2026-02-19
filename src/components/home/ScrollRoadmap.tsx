import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Wallet, RefreshCw, TrendingUp, Gamepad2, Trophy, Shield } from 'lucide-react';
import { GlassPanel } from '@/components/AnimatedBackground';

const roadmapSteps = [
  {
    id: 1,
    title: 'Deposit ETH or USDC',
    description: 'Send funds to your SkillStack vault — non-custodial and always in your control.',
    icon: Wallet,
    visual: 'deposit',
  },
  {
    id: 2,
    title: 'Vault Stakes Automatically',
    description: 'Your ETH becomes rETH, USDC becomes aUSDC — earning baseline yield immediately.',
    icon: RefreshCw,
    visual: 'stake',
  },
  {
    id: 3,
    title: 'Awards Accumulate',
    description: 'Watch your Pending Awards grow over time from vault yield strategies.',
    icon: TrendingUp,
    visual: 'accumulate',
  },
  {
    id: 4,
    title: 'Play Competitive Games',
    description: 'Join lobbies and compete against other players using your accumulated awards.',
    icon: Gamepad2,
    visual: 'play',
  },
  {
    id: 5,
    title: 'Win Outsized Yield',
    description: 'Victory means claiming awards from the prize pool — multiplying your earnings.',
    icon: Trophy,
    visual: 'win',
  },
  {
    id: 6,
    title: 'Zero Downside Risk',
    description: 'Your principal stays staked and protected. You only compete with yield — never your deposit.',
    icon: Shield,
    visual: 'safe',
  },
];

// Token component for deposit visual with drift animation
const DriftingToken = ({ delay, children, isActive }: { delay: number; children: React.ReactNode; isActive: boolean }) => (
  <div 
    className={cn(
      'px-2 py-1 rounded bg-surface-3 text-xs transition-all duration-500',
      isActive && 'token-drift'
    )}
    style={{ animationDelay: `${delay}ms` }}
  >
    {children}
  </div>
);

const StepVisual = ({ type, isActive }: { type: string; isActive: boolean }) => {
  return (
    <div className={cn(
      'w-full h-48 rounded-lg border transition-all duration-500 overflow-hidden relative',
      isActive 
        ? 'bg-surface-2 border-primary/30 shadow-[0_0_30px_hsl(185_100%_50%/0.15)]' 
        : 'bg-surface-1 border-border'
    )}>
      {type === 'deposit' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-14 h-14 rounded-lg flex items-center justify-center transition-all duration-500',
              isActive ? 'bg-primary/20' : 'bg-surface-3'
            )}>
              <Wallet className={cn('w-7 h-7 transition-transform duration-500', isActive ? 'text-primary scale-110' : 'text-muted-foreground')} />
            </div>
            <div className="flex flex-col gap-1">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-500',
                    isActive ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                  style={{ 
                    width: isActive ? `${32 - i * 4}px` : '8px',
                    transitionDelay: `${i * 100}ms`,
                    opacity: isActive ? 1 - i * 0.2 : 0.3,
                  }}
                />
              ))}
            </div>
            <div className={cn(
              'w-16 h-16 rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-500',
              isActive ? 'bg-primary text-primary-foreground shadow-[0_0_25px_hsl(185_100%_50%/0.4)]' : 'bg-surface-3 text-muted-foreground'
            )}>
              <span className="text-[10px] font-bold tracking-wider">VAULT</span>
            </div>
          </div>
          <div className={cn(
            'absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 text-xs transition-all duration-500',
            isActive ? 'text-primary opacity-100 translate-y-0' : 'text-muted-foreground/50 opacity-0 translate-y-2'
          )}>
            <DriftingToken delay={0} isActive={isActive}>ETH</DriftingToken>
            <DriftingToken delay={150} isActive={isActive}>USDC</DriftingToken>
          </div>
        </div>
      )}

      {type === 'stake' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-all duration-500',
                isActive ? 'bg-surface-3 text-foreground transform-pulse' : 'bg-surface-3/50 text-muted-foreground'
              )}>
                ETH
              </div>
              <div className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-all duration-500',
                isActive ? 'bg-surface-3 text-foreground transform-pulse' : 'bg-surface-3/50 text-muted-foreground'
              )}
              style={{ animationDelay: '200ms' }}
              >
                USDC
              </div>
            </div>
            <div className={cn(
              'text-2xl transition-all duration-500',
              isActive ? 'text-primary scale-125' : 'text-muted-foreground/30'
            )}>
              →
            </div>
            <div className={cn(
              'w-20 h-24 rounded-lg flex flex-col items-center justify-center gap-2 transition-all duration-500',
              isActive ? 'bg-primary/10 border border-primary/30 shadow-[0_0_20px_hsl(185_100%_50%/0.2)]' : 'bg-surface-3'
            )}>
              <span className="text-[9px] font-bold text-muted-foreground">VAULT</span>
              <div className={cn(
                'px-2 py-1 rounded text-xs font-medium transition-all duration-500',
                isActive ? 'bg-primary/20 text-primary scale-105' : 'bg-surface-2 text-muted-foreground'
              )}>
                rETH
              </div>
              <div className={cn(
                'px-2 py-1 rounded text-xs font-medium transition-all duration-500',
                isActive ? 'bg-primary/20 text-primary scale-105' : 'bg-surface-2 text-muted-foreground'
              )}
              style={{ transitionDelay: '100ms' }}
              >
                aUSDC
              </div>
            </div>
          </div>
        </div>
      )}

      {type === 'accumulate' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              'text-sm font-medium transition-all duration-500',
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )}>
              Pending Awards
            </div>
            <div className={cn(
              'text-3xl font-bold font-mono tabular-nums transition-all duration-500',
              isActive ? 'text-primary' : 'text-muted-foreground/50'
            )}>
              {isActive ? (
                <AnimatedCounter />
              ) : (
                '0.0000'
              )}
            </div>
            <div className="flex items-end gap-1 h-12">
              {[20, 30, 35, 42, 48, 55, 62, 70].map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-3 rounded-t transition-all duration-500 origin-bottom',
                    isActive ? 'bg-primary' : 'bg-muted-foreground/20'
                  )}
                  style={{ 
                    height: isActive ? `${h}%` : '20%',
                    opacity: isActive ? 0.4 + (i * 0.075) : 0.3,
                    transitionDelay: `${i * 50}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {type === 'play' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center text-[9px] font-bold transition-all duration-500',
              isActive ? 'bg-primary/20 text-primary' : 'bg-surface-3 text-muted-foreground'
            )}>
              VAULT
            </div>
            <div className={cn('text-lg transition-all duration-300', isActive ? 'text-primary scale-125' : 'text-muted-foreground/30')}
              style={{ transitionDelay: '100ms' }}>→</div>
            <div className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center text-[9px] font-bold transition-all duration-500',
              isActive ? 'bg-surface-3 text-foreground scale-105' : 'bg-surface-3 text-muted-foreground'
            )}
            style={{ transitionDelay: '200ms' }}>
              LOBBY
            </div>
            <div className={cn('text-lg transition-all duration-300', isActive ? 'text-primary scale-125' : 'text-muted-foreground/30')}
              style={{ transitionDelay: '300ms' }}>→</div>
            <div className={cn(
              'w-16 h-16 rounded-lg flex items-center justify-center transition-all duration-500',
              isActive ? 'bg-primary text-primary-foreground shadow-[0_0_30px_hsl(185_100%_50%/0.5)]' : 'bg-surface-3 text-muted-foreground'
            )}
            style={{ transitionDelay: '400ms' }}>
              <Gamepad2 className={cn('w-7 h-7 transition-transform duration-500', isActive && 'scale-110')} />
            </div>
          </div>
        </div>
      )}

      {type === 'win' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500',
              isActive ? 'bg-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.4)]' : 'bg-surface-3'
            )}>
              <Trophy className={cn('w-8 h-8 transition-all duration-500', isActive ? 'text-amber-400 scale-110' : 'text-muted-foreground')} />
            </div>
            <div className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold transition-all duration-500',
              isActive ? 'bg-primary/20 text-primary scale-105 shadow-[0_0_15px_hsl(185_100%_50%/0.3)]' : 'bg-surface-3 text-muted-foreground'
            )}>
              + 2.45 Awards
            </div>
            <div className={cn(
              'text-xs transition-all duration-500',
              isActive ? 'text-muted-foreground opacity-100' : 'text-muted-foreground/50 opacity-0'
            )}>
              Prize pool multiplier
            </div>
          </div>
        </div>
      )}

      {type === 'safe' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-6">
            <div className={cn(
              'w-20 h-24 rounded-lg flex flex-col items-center justify-center gap-2 transition-all duration-500 relative',
              isActive ? 'bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.2)]' : 'bg-surface-3'
            )}>
              <Shield className={cn('w-6 h-6 transition-all duration-500', isActive ? 'text-emerald-400 scale-110' : 'text-muted-foreground')} />
              <span className={cn(
                'text-[10px] font-bold transition-colors duration-500',
                isActive ? 'text-emerald-400' : 'text-muted-foreground'
              )}>
                PRINCIPAL
              </span>
              <div className={cn(
                'absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center transition-all duration-300',
                isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
              )}>
                <span className="text-[8px] text-emerald-950 font-bold">✓</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-center">
              <span className={cn(
                'text-xs font-medium transition-all duration-500',
                isActive ? 'text-foreground translate-x-0' : 'text-muted-foreground -translate-x-2'
              )}>
                Unchanged
              </span>
              <span className={cn(
                'text-[10px] transition-all duration-500',
                isActive ? 'text-muted-foreground opacity-100' : 'text-muted-foreground/50 opacity-0'
              )}>
                Always protected
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AnimatedCounter = () => {
  const [value, setValue] = useState(0);
  const [tick, setTick] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setValue(prev => {
        const next = prev + 0.0012;
        return next > 1.5 ? 0.3 : next;
      });
      setTick(true);
      setTimeout(() => setTick(false), 150);
    }, 100);
    return () => clearInterval(interval);
  }, []);
  
  return <span className={tick ? 'counter-tick' : ''}>{value.toFixed(4)}</span>;
};

export const ScrollRoadmap = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(1);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activatedSteps, setActivatedSteps] = useState<Set<number>>(new Set([1]));
  const prevActiveStep = useRef(1);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const containerTop = rect.top;
      const containerHeight = rect.height;
      const viewportHeight = window.innerHeight;
      
      const scrollStart = containerTop - viewportHeight * 0.5;
      const scrollEnd = containerTop + containerHeight - viewportHeight * 0.5;
      const scrollRange = scrollEnd - scrollStart;
      const currentScroll = -scrollStart;
      
      const progress = Math.max(0, Math.min(1, currentScroll / scrollRange));
      setScrollProgress(progress);
      
      const stepProgress = progress * 6;
      const newActiveStep = Math.max(1, Math.min(6, Math.ceil(stepProgress) || 1));
      
      if (newActiveStep !== prevActiveStep.current) {
        prevActiveStep.current = newActiveStep;
        setActiveStep(newActiveStep);
        setActivatedSteps(prev => new Set([...prev, newActiveStep]));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section ref={containerRef} className="py-24 relative">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            How <span className="text-gradient-cyan">SkillStack</span> Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A new way to earn — stake, compete, and keep your principal safe.
          </p>
        </div>

        <div className="relative">
          {/* Progress Rail */}
          <div className="absolute left-4 md:left-8 top-0 bottom-0 w-0.5 bg-surface-3 overflow-hidden">
            <div 
              className="absolute top-0 left-0 w-full bg-gradient-to-b from-primary via-primary to-accent transition-all duration-500 ease-out"
              style={{ height: `${scrollProgress * 100}%` }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-16 md:space-y-24">
            {roadmapSteps.map((step, index) => {
              const isPast = step.id < activeStep;
              const isActive = step.id === activeStep;
              const isFuture = step.id > activeStep;
              const wasJustActivated = activatedSteps.has(step.id) && isActive;

              return (
                <div 
                  key={step.id}
                  className={cn(
                    'relative pl-12 md:pl-20 transition-all duration-500',
                    isActive && 'scale-[1.02]',
                    isFuture && 'opacity-40'
                  )}
                >
                  {/* Step Number with checkpoint ping */}
                  <div 
                    className={cn(
                      'absolute left-0 md:left-4 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 z-10',
                      isActive && 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(185_100%_50%/0.5)] scale-110',
                      isPast && 'bg-primary/30 text-primary',
                      isFuture && 'bg-surface-3 text-muted-foreground',
                      wasJustActivated && 'checkpoint-ping'
                    )}
                  >
                    {isPast ? '✓' : step.id}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
                    {/* Content */}
                    <div className={cn(
                      'transition-all duration-500',
                      index % 2 === 1 && 'md:order-2'
                    )}>
                      <GlassPanel active={isActive} glow={isActive} className="p-5">
                        <div className={cn(
                          'flex items-center gap-3 mb-3 transition-all duration-500',
                          isActive && 'translate-x-2'
                        )}>
                          <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-500',
                            isActive ? 'bg-primary/20 scale-110' : 'bg-surface-2/50'
                          )}>
                            <step.icon className={cn(
                              'w-5 h-5 transition-all duration-500',
                              isActive ? 'text-primary' : 'text-muted-foreground'
                            )} />
                          </div>
                          <h3 className={cn(
                            'text-xl font-semibold tracking-tight transition-colors duration-500',
                            isActive ? 'text-foreground' : 'text-muted-foreground'
                          )}>
                            {step.title}
                          </h3>
                        </div>
                        <p className={cn(
                          'text-base leading-relaxed transition-colors duration-500',
                          isActive ? 'text-muted-foreground' : 'text-muted-foreground/60'
                        )}>
                          {step.description}
                        </p>
                      </GlassPanel>
                    </div>

                    {/* Visual */}
                    <div className={cn(
                      'transition-all duration-500',
                      index % 2 === 1 && 'md:order-1'
                    )}>
                      <StepVisual type={step.visual} isActive={isActive} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
