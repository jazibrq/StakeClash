import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({ 
  icon, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) => (
  <div className={cn('card-surface p-12 text-center', className)}>
    {icon && (
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      </div>
    )}
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
        {description}
      </p>
    )}
    {action}
  </div>
);

interface StatusBadgeProps {
  status: 'success' | 'error' | 'warning' | 'info' | 'pending';
  children: React.ReactNode;
  className?: string;
}

export const StatusBadge = ({ status, children, className }: StatusBadgeProps) => {
  const styles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    info: 'bg-primary/10 text-primary border-primary/20',
    pending: 'bg-muted text-muted-foreground border-border',
  };

  const icons = {
    success: <CheckCircle className="w-3 h-3" />,
    error: <X className="w-3 h-3" />,
    warning: <AlertCircle className="w-3 h-3" />,
    info: <Info className="w-3 h-3" />,
    pending: <div className="w-2 h-2 rounded-full bg-current animate-pulse" />,
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border',
      styles[status],
      className
    )}>
      {icons[status]}
      {children}
    </span>
  );
};

// Animated number component
const AnimatedValue = ({ value, duration = 1500 }: { value: string; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState('0');
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          
          // Extract numeric part
          const numMatch = value.match(/[\d.]+/);
          if (!numMatch) {
            setDisplayValue(value);
            return;
          }
          
          const endNum = parseFloat(numMatch[0]);
          const prefix = value.slice(0, value.indexOf(numMatch[0]));
          const suffix = value.slice(value.indexOf(numMatch[0]) + numMatch[0].length);
          const decimals = numMatch[0].includes('.') ? numMatch[0].split('.')[1].length : 0;
          
          const startTime = Date.now();
          
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentNum = endNum * easeOut;
            
            setDisplayValue(`${prefix}${currentNum.toFixed(decimals)}${suffix}`);
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setDisplayValue(value);
            }
          };
          
          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [value, duration, hasAnimated]);

  return <span ref={ref}>{displayValue}</span>;
};

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: { value: number; positive: boolean };
  icon?: React.ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
}

export const MetricCard = ({
  label,
  value,
  subValue,
  trend,
  icon,
  className,
  animate = true,
  delay = 0,
}: MetricCardProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div 
      ref={ref}
      className={cn(
        'card-surface p-5 transition-all duration-500',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="metric-label mb-1">{label}</p>
          <p className="metric-value">
            {animate ? <AnimatedValue value={String(value)} /> : value}
          </p>
          {subValue && (
            <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
          )}
          {trend && (
            <p className={cn(
              'text-xs font-medium mt-1 transition-all duration-300',
              trend.positive ? 'text-emerald-400' : 'text-red-400',
              isVisible ? 'opacity-100' : 'opacity-0'
            )}>
              {trend.positive ? '+' : ''}{trend.value}%
            </p>
          )}
        </div>
        {icon && (
          <div className={cn(
            'w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center text-muted-foreground transition-all duration-500',
            isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
