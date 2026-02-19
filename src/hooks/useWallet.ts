import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      setState((s) => ({ ...s, error: 'MetaMask is not installed' }));
      return;
    }

    setState((s) => ({ ...s, isConnecting: true, error: null }));

    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (accounts.length > 0) {
        setState({
          address: accounts[0],
          isConnected: true,
          isConnecting: false,
          error: null,
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to connect wallet';
      setState({
        address: null,
        isConnected: false,
        isConnecting: false,
        error: message,
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  }, []);

  // Listen for account changes
  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        // User disconnected from MetaMask
        setState({
          address: null,
          isConnected: false,
          isConnecting: false,
          error: null,
        });
      } else {
        setState((s) => ({
          ...s,
          address: accounts[0],
          isConnected: true,
        }));
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  // Check if already connected on mount
  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts) => {
        const accts = accounts as string[];
        if (accts.length > 0) {
          setState({
            address: accts[0],
            isConnected: true,
            isConnecting: false,
            error: null,
          });
        }
      })
      .catch(() => {
        // silently ignore
      });
  }, []);

  return {
    ...state,
    shortenedAddress: state.address ? shortenAddress(state.address) : null,
    connect,
    disconnect,
  };
}
