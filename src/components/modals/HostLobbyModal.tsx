import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface HostLobbyModalProps {
  open: boolean;
  onClose: () => void;
  onHost?: (data: { stake: string; size: number; minYield: string }) => void;
}

const lobbySizes = [2, 4, 8, 16];

export const HostLobbyModal = ({ open, onClose, onHost }: HostLobbyModalProps) => {
  const [stake, setStake] = useState('');
  const [size, setSize] = useState(4);

  const handleHost = () => {
    onHost?.({ stake, size, minYield: '' });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalContent>
        <ModalHeader onClose={onClose}>Host New Lobby</ModalHeader>

        <div className="space-y-6">
          {/* Stake Amount */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Stake Amount (ETH)</label>
            <Input
              type="number"
              placeholder="0.00"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="text-lg font-mono"
            />
          </div>

          {/* Lobby Size */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Lobby Size</label>
            <div className="grid grid-cols-4 gap-2">
              {lobbySizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={cn(
                    'py-2 rounded-lg text-sm font-medium transition-all',
                    size === s
                      ? 'bg-primary text-primary-foreground shadow-glow-cyan-subtle'
                      : 'bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 rounded-lg bg-surface-2 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Prize Pool</span>
              <span className="font-mono text-primary">
                {stake ? (parseFloat(stake) * size).toFixed(2) : '0.00'} ETH
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Winner Takes</span>
              <span className="font-mono">
                {stake ? (parseFloat(stake) * size * 0.9).toFixed(2) : '0.00'} ETH
              </span>
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleHost}
            disabled={!stake || parseFloat(stake) <= 0}
            className="flex-1 btn-cyan-gradient"
          >
            Create Lobby
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
