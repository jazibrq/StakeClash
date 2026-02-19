import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/modal';
import { Info, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdraw' | 'redeem';
  maxAmount?: string;
  onConfirm?: (amount: string) => void;
}

export const TransactionModal = ({ 
  open, 
  onClose, 
  type,
  maxAmount = '10.5',
  onConfirm 
}: TransactionModalProps) => {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'input' | 'approving' | 'confirming' | 'success'>('input');

  const titles = {
    deposit: 'Deposit to Vault',
    withdraw: 'Withdraw from Vault',
    redeem: 'Redeem Pending Awards',
  };

  const handleConfirm = () => {
    setStep('approving');
    setTimeout(() => setStep('confirming'), 1500);
    setTimeout(() => {
      setStep('success');
      onConfirm?.(amount);
    }, 3000);
  };

  const handleClose = () => {
    setStep('input');
    setAmount('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalContent>
        <ModalHeader onClose={handleClose}>{titles[type]}</ModalHeader>

        {step === 'input' && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Amount (ETH)</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-16 text-lg font-mono"
                  />
                  <button
                    onClick={() => setAmount(maxAmount)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Available: {maxAmount} ETH
                </p>
              </div>

              {type === 'withdraw' && (
                <div className="flex gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200">
                    Withdrawing reduces your staked balance and may affect your eligible lobby tier.
                  </p>
                </div>
              )}

              {type === 'redeem' && (
                <div className="flex gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground/80">
                    Redeeming moves your pending awards into your core staking balance. 
                    Withdraw is a separate action.
                  </p>
                </div>
              )}

              <div className="p-3 rounded-lg bg-surface-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Gas</span>
                  <span className="font-mono">~0.002 ETH</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Network</span>
                  <span>Ethereum</span>
                </div>
              </div>
            </div>

            <ModalFooter>
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={!amount || parseFloat(amount) <= 0}
                className="flex-1 btn-cyan-gradient"
              >
                Confirm {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            </ModalFooter>
          </>
        )}

        {(step === 'approving' || step === 'confirming') && (
          <div className="py-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <div className="absolute inset-0 rounded-full animate-glow-pulse" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  step === 'approving' ? 'bg-primary text-primary-foreground' : 'bg-emerald-500 text-white'
                )}>
                  {step === 'confirming' ? <CheckCircle className="w-4 h-4" /> : '1'}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  step === 'confirming' ? 'bg-primary text-primary-foreground' : 'bg-surface-3 text-muted-foreground'
                )}>
                  2
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {step === 'approving' ? 'Approving transaction...' : 'Confirming on network...'}
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Transaction Successful!</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {amount} ETH has been {type === 'deposit' ? 'deposited' : type === 'withdraw' ? 'withdrawn' : 'redeemed'}.
            </p>
            <Button onClick={handleClose} className="btn-cyan-gradient">
              Done
            </Button>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
};
