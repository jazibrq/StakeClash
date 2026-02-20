import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent } from '@/components/ui/modal';
import { ChevronDown, Loader2, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { depositToTreasury } from '@/lib/vault';
import { useWalletContext } from '@/contexts/WalletContext';

/* ─── Assets ─────────────────────────────────────────────────────── */

export interface VaultAsset {
  symbol:  string;
  name:    string;
  color:   string;
  icon:    string;
}

const ASSETS: VaultAsset[] = [
  { symbol: 'ETH',  name: 'Ethereum',  color: '#627eea', icon: 'Ξ'  },
  { symbol: 'USDC', name: 'USD Coin',  color: '#2775ca', icon: '$'  },
  { symbol: 'SOL',  name: 'Solana',    color: '#9945ff', icon: '◎'  },
  { symbol: 'HBAR', name: 'Hedera',    color: '#00e5ff', icon: '⬡'  },
];

/* ─── Component ──────────────────────────────────────────────────── */

interface VaultDepositModalProps {
  open:    boolean;
  onClose: () => void;
  mode:    'deposit' | 'withdraw';
  /** Called after a successful deposit/withdraw with token symbol and amount */
  onTransaction?: (token: string, amount: number, mode: 'deposit' | 'withdraw') => void;
  /** Native token balance from the wallet (e.g. HBAR on Hedera Testnet) */
  walletBalance?: string | null;
  /** Whether the wallet is on Hedera Testnet */
  isHederaTestnet?: boolean;
}

export const VaultDepositModal = ({ open, onClose, mode, onTransaction, walletBalance, isHederaTestnet }: VaultDepositModalProps) => {
  const { switchToHederaTestnet } = useWalletContext();
  const [asset, setAsset]               = useState<VaultAsset>(ASSETS[0]);
  const [amount, setAmount]             = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [step, setStep]                 = useState<'input' | 'pending' | 'success'>('input');
  const [txError, setTxError]           = useState<string | null>(null);
  const dropdownRef                     = useRef<HTMLDivElement>(null);

  /* close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleConfirm = async () => {
    setTxError(null);
    setStep('pending');

    try {
      if (mode === 'deposit' && asset.symbol === 'HBAR') {
        if (!isHederaTestnet) {
          await switchToHederaTestnet();
          setStep('input');
          setTxError('Network switched to Hedera Testnet. Click Deposit again.');
          return;
        }
        await depositToTreasury(amount);
      } else {
        // Non-HBAR or withdraw: keep mock flow for now
        await new Promise(r => setTimeout(r, 2400));
      }

      setStep('success');
      const parsed = parseFloat(amount);
      if (parsed > 0 && onTransaction) {
        onTransaction(asset.symbol, parsed, mode);
      }
    } catch (err) {
      setStep('input');
      setTxError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleClose = () => {
    setStep('input');
    setAmount('');
    setTxError(null);
    onClose();
  };

  /* Resolve display balance for the selected asset */
  const displayBalance = (() => {
    // HBAR: show real balance when on Hedera Testnet
    if (asset.symbol === 'HBAR' && isHederaTestnet && walletBalance) {
      return `${parseFloat(walletBalance).toFixed(2)} HBAR`;
    }
    // ETH: show real balance when NOT on Hedera Testnet (mainnet / other EVM)
    if (asset.symbol === 'ETH' && !isHederaTestnet && walletBalance) {
      return `${parseFloat(walletBalance).toFixed(4)} ETH`;
    }
    return '—';
  })();

  const maxAmount = (() => {
    if (asset.symbol === 'HBAR' && isHederaTestnet && walletBalance) return walletBalance;
    if (asset.symbol === 'ETH' && !isHederaTestnet && walletBalance) return walletBalance;
    return null;
  })();

  const label = mode === 'deposit' ? 'Deposit' : 'Withdraw';
  const valid = amount && parseFloat(amount) > 0;

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalContent className="!p-0 max-w-[420px] overflow-visible">
        {/* ── Input step ── */}
        {step === 'input' && (
          <div className="p-5">
            {/* header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">{label}</h2>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* amount box */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">You {mode}</span>
                <span className="text-xs text-muted-foreground">
                  Balance: <span className="font-mono">{displayBalance}</span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* amount input */}
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={e => {
                    const v = e.target.value;
                    if (/^[0-9]*\.?[0-9]*$/.test(v)) setAmount(v);
                  }}
                  className="flex-1 bg-transparent text-3xl font-medium outline-none placeholder:text-white/20 min-w-0 font-mono"
                />

                {/* asset selector */}
                <div ref={dropdownRef} className="relative flex-shrink-0">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className={cn(
                      'flex items-center gap-2 rounded-full px-3 py-2 transition-colors',
                      'bg-white/[0.08] hover:bg-white/[0.12]',
                      'border border-white/[0.1]',
                    )}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: `${asset.color}30`, color: asset.color }}
                    >
                      {asset.icon}
                    </span>
                    <span className="text-sm font-semibold">{asset.symbol}</span>
                    <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', dropdownOpen && 'rotate-180')} />
                  </button>

                  {/* dropdown */}
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-[#1a1a2e] border border-white/[0.1] shadow-2xl overflow-hidden z-50">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 pt-3 pb-1">
                        Select token
                      </p>
                      {ASSETS.map(a => (
                        <button
                          key={a.symbol}
                          onClick={() => { setAsset(a); setDropdownOpen(false); }}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                            'hover:bg-white/[0.06]',
                            asset.symbol === a.symbol && 'bg-white/[0.04]',
                          )}
                        >
                          <span
                            className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ background: `${a.color}25`, color: a.color }}
                          >
                            {a.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{a.symbol}</p>
                            <p className="text-xs text-muted-foreground">{a.name}</p>
                          </div>
                          {asset.symbol === a.symbol && (
                            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button
                  onClick={() => {
                    if (maxAmount) {
                      // Leave a small gas reserve
                      const max = Math.max(0, parseFloat(maxAmount) - 0.5);
                      setAmount(max.toFixed(4));
                    }
                  }}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            {txError && (
              <p className="mt-3 text-xs text-red-400 text-center">{txError}</p>
            )}

            {/* action button */}
            <Button
              onClick={handleConfirm}
              disabled={!valid}
              className="w-full mt-4 h-12 text-sm font-semibold btn-cyan-gradient rounded-xl"
            >
              {valid ? `${label} ${amount} ${asset.symbol}` : `Enter amount`}
            </Button>
          </div>
        )}

        {/* ── Pending step ── */}
        {step === 'pending' && (
          <div className="p-8 text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium mb-1">
              {mode === 'deposit' ? 'Depositing' : 'Withdrawing'} {amount} {asset.symbol}
            </p>
            <p className="text-xs text-muted-foreground">Confirm in your wallet...</p>
          </div>
        )}

        {/* ── Success step ── */}
        {step === 'success' && (
          <div className="p-8 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: `${asset.color}20` }}
            >
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold mb-1">
              {label} Successful
            </p>
            <p className="text-xs text-muted-foreground mb-5">
              {amount} {asset.symbol} {mode === 'deposit' ? 'deposited into vault' : 'withdrawn from vault'}
            </p>
            <Button onClick={handleClose} className="btn-cyan-gradient px-8 rounded-xl">
              Done
            </Button>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
};
