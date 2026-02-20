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
  chainId: number | null;
  balance: string | null;   // native token balance (e.g. HBAR) as human-readable string
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

/* Hedera Testnet chain config */
const HEDERA_TESTNET_CHAIN_ID = 296; // 0x128
const HEDERA_TESTNET_CONFIG = {
  chainId: '0x128',
  chainName: 'Hedera Testnet',
  nativeCurrency: { name: 'HBAR', symbol: 'HBAR', decimals: 18 },
  rpcUrls: ['https://testnet.hashio.io/api'],
  blockExplorerUrls: ['https://hashscan.io/testnet'],
};

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const WALLET_SESSION_KEY = 'stakeclash_wallet_session';

/** Convert hex wei/weibar balance to a human-readable string */
function formatNativeBalance(hexBalance: string): string {
  const wei = BigInt(hexBalance);
  const whole = wei / BigInt(10 ** 18);
  const frac  = wei % BigInt(10 ** 18);
  const fracStr = frac.toString().padStart(18, '0').slice(0, 4);
  return `${whole}.${fracStr}`;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    balance: null,
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
        // Fetch chain ID and balance right away
        const [hexChain, hexBal] = await Promise.all([
          window.ethereum!.request({ method: 'eth_chainId' }) as Promise<string>,
          window.ethereum!.request({ method: 'eth_getBalance', params: [accounts[0], 'latest'] }) as Promise<string>,
        ]);
        setState({
          address: accounts[0],
          chainId: parseInt(hexChain, 16),
          balance: formatNativeBalance(hexBal),
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
        chainId: null,
        balance: null,
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
      chainId: null,
      balance: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  }, []);

  /** Prompt MetaMask to switch to (or add) Hedera Testnet */
  const switchToHederaTestnet = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: HEDERA_TESTNET_CONFIG.chainId }],
      });
    } catch (err: unknown) {
      // 4902 = chain not added yet
      if ((err as { code?: number })?.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [HEDERA_TESTNET_CONFIG],
        });
      }
    }
  }, []);

  // Listen for account changes
  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        localStorage.removeItem(WALLET_SESSION_KEY);
        setState({
          address: null,
          chainId: null,
          balance: null,
          isConnected: false,
          isConnecting: false,
          error: null,
        });
      } else {
        // Refresh balance for new account
        ethereum.request({ method: 'eth_getBalance', params: [accounts[0], 'latest'] })
          .then((hexBal) => {
            setState((s) => ({
              ...s,
              address: accounts[0],
              balance: formatNativeBalance(hexBal as string),
              isConnected: true,
            }));
          })
          .catch(() => {
            setState((s) => ({ ...s, address: accounts[0], isConnected: true }));
          });
      }
    };

    const handleChainChanged = (...args: unknown[]) => {
      const hexChain = args[0] as string;
      const newChainId = parseInt(hexChain, 16);
      setState((s) => ({ ...s, chainId: newChainId, balance: null }));
      // Refetch balance on the new chain
      if (state.address) {
        ethereum.request({ method: 'eth_getBalance', params: [state.address, 'latest'] })
          .then((hexBal) => {
            setState((s) => ({ ...s, balance: formatNativeBalance(hexBal as string) }));
          })
          .catch(() => {});
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);
    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [state.address]);

  // Auto-reconnect: if user previously connected, silently restore session
  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    const hadSession = localStorage.getItem(WALLET_SESSION_KEY) === 'connected';

    // Use eth_requestAccounts for returning users (prompts only if not already authorised)
    // Use eth_accounts for fresh visits (never prompts)
    const method = hadSession ? 'eth_requestAccounts' : 'eth_accounts';

    (async () => {
      try {
        const accounts = (await ethereum.request({ method })) as string[];
        if (accounts.length > 0) {
          localStorage.setItem(WALLET_SESSION_KEY, 'connected');
          // Also grab chain + balance on reconnect
          const [hexChain, hexBal] = await Promise.all([
            ethereum.request({ method: 'eth_chainId' }) as Promise<string>,
            ethereum.request({ method: 'eth_getBalance', params: [accounts[0], 'latest'] }) as Promise<string>,
          ]);
          setState({
            address: accounts[0],
            chainId: parseInt(hexChain, 16),
            balance: formatNativeBalance(hexBal),
            isConnected: true,
            isConnecting: false,
            error: null,
          });
        } else if (hadSession) {
          localStorage.removeItem(WALLET_SESSION_KEY);
        }
      } catch {
        // silently ignore – user may have rejected the popup
      }
    })();
  }, []);

  const isHederaTestnet = state.chainId === HEDERA_TESTNET_CHAIN_ID;

  return {
    ...state,
    isHederaTestnet,
    shortenedAddress: state.address ? shortenAddress(state.address) : null,
    connect,
    disconnect,
    switchToHederaTestnet,
  };
}
