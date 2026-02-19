import { createContext, useContext, type ReactNode } from 'react';
import { useWallet } from '@/hooks/useWallet';

type WalletContextType = ReturnType<typeof useWallet>;

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  return (
    <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
  );
}

export function useWalletContext(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return ctx;
}
