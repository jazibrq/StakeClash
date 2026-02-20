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

const WALLET_SESSION_KEY = 'stakeclash_wallet_session';

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
        localStorage.setItem(WALLET_SESSION_KEY, 'connected');
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
    localStorage.removeItem(WALLET_SESSION_KEY);
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
        localStorage.removeItem(WALLET_SESSION_KEY);
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

  // Auto-reconnect: if user previously connected, silently restore session
  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    const hadSession = localStorage.getItem(WALLET_SESSION_KEY) === 'connected';

    // Use eth_requestAccounts for returning users (prompts only if not already authorised)
    // Use eth_accounts for fresh visits (never prompts)
    const method = hadSession ? 'eth_requestAccounts' : 'eth_accounts';

    ethereum
      .request({ method })
      .then((accounts) => {
        const accts = accounts as string[];
        if (accts.length > 0) {
          localStorage.setItem(WALLET_SESSION_KEY, 'connected');
          setState({
            address: accts[0],
            isConnected: true,
            isConnecting: false,
            error: null,
          });
        } else if (hadSession) {
          // Session flag exists but MetaMask returned no accounts – clean up
          localStorage.removeItem(WALLET_SESSION_KEY);
        }
      })
      .catch(() => {
        // silently ignore – user may have rejected the popup
      });
  }, []);

  return {
    ...state,
    shortenedAddress: state.address ? shortenAddress(state.address) : null,
    connect,
    disconnect,
  };
}
