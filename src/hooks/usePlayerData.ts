import { useState, useEffect, useCallback, useRef } from 'react';

/* ─── Types ──────────────────────────────────────────────────────── */

export interface VaultBalance {
  ETH:  number;
  USDC: number;
  SOL:  number;
  HBAR: number;
}

export interface VaultTx {
  id:     string;
  date:   string;       // ISO string
  type:   'Deposit' | 'Withdraw';
  token:  string;
  amount: number;
}

export interface MatchRecord {
  id:        string;
  date:      string;
  opponent:  string;
  size:      number;
  result:    'Won' | 'Lost';
  awards:    string;      // e.g. "+0.45" or "-0.00"
  resources: { ore: number; gold: number; diamond: number; mana: number };
}

export interface PlayerData {
  vaultBalances:  VaultBalance;
  vaultActivity:  VaultTx[];
  matchHistory:   MatchRecord[];
}

const DUMMY_MATCHES: MatchRecord[] = [
  {
    id: 'dummy_1', date: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    opponent: 'ShadowBlade99', size: 2, result: 'Won', awards: '+0.32',
    resources: { ore: 24, gold: 12, diamond: 4, mana: 8 },
  },
  {
    id: 'dummy_2', date: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    opponent: 'CryptoKnight', size: 2, result: 'Lost', awards: '-0.00',
    resources: { ore: 0, gold: 0, diamond: 0, mana: 0 },
  },
  {
    id: 'dummy_3', date: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    opponent: 'VaultHunter', size: 4, result: 'Won', awards: '+0.48',
    resources: { ore: 24, gold: 12, diamond: 4, mana: 8 },
  },
];

const EMPTY_DATA: PlayerData = {
  vaultBalances: { ETH: 0, USDC: 0, SOL: 0, HBAR: 0 },
  vaultActivity: [],
  matchHistory:  [],
};

/* ─── localStorage helpers ───────────────────────────────────────── */

const STORAGE_PREFIX = 'stakeclash_player_';

function storageKey(address: string): string {
  return `${STORAGE_PREFIX}${address.toLowerCase()}`;
}

function loadPlayerData(address: string): PlayerData {
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (!raw) return { ...EMPTY_DATA, vaultBalances: { ...EMPTY_DATA.vaultBalances }, matchHistory: DUMMY_MATCHES };
    const parsed = JSON.parse(raw);
    return {
      vaultBalances: { ...EMPTY_DATA.vaultBalances, ...parsed.vaultBalances },
      vaultActivity: Array.isArray(parsed.vaultActivity) ? parsed.vaultActivity : [],
      matchHistory:  Array.isArray(parsed.matchHistory) && parsed.matchHistory.length > 0
        ? parsed.matchHistory
        : DUMMY_MATCHES,
    };
  } catch {
    return { ...EMPTY_DATA, vaultBalances: { ...EMPTY_DATA.vaultBalances }, matchHistory: DUMMY_MATCHES };
  }
}

function savePlayerData(address: string, data: PlayerData): void {
  try {
    localStorage.setItem(storageKey(address), JSON.stringify(data));
  } catch {
    // storage full — silently fail
  }
}

/* ─── Hook ───────────────────────────────────────────────────────── */

export function usePlayerData(walletAddress: string | null) {
  const [data, setData] = useState<PlayerData>(EMPTY_DATA);
  const addrRef = useRef(walletAddress);
  addrRef.current = walletAddress;

  /* Load data when wallet changes */
  useEffect(() => {
    if (!walletAddress) {
      setData({ ...EMPTY_DATA, vaultBalances: { ...EMPTY_DATA.vaultBalances }, matchHistory: DUMMY_MATCHES });
      return;
    }
    setData(loadPlayerData(walletAddress));
  }, [walletAddress]);

  /* Persist whenever data changes (debounced by React batching) */
  useEffect(() => {
    const addr = addrRef.current;
    if (!addr) return;
    savePlayerData(addr, data);
  }, [data]);

  /* ── Actions ── */

  const recordDeposit = useCallback((token: string, amount: number) => {
    setData(prev => {
      const key = token as keyof VaultBalance;
      const newBalances = { ...prev.vaultBalances };
      if (key in newBalances) {
        newBalances[key] = (newBalances[key] || 0) + amount;
      }
      const tx: VaultTx = {
        id:     `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        date:   new Date().toISOString(),
        type:   'Deposit',
        token,
        amount,
      };
      return {
        ...prev,
        vaultBalances: newBalances,
        vaultActivity: [tx, ...prev.vaultActivity].slice(0, 50),
      };
    });
  }, []);

  const recordWithdraw = useCallback((token: string, amount: number) => {
    setData(prev => {
      const key = token as keyof VaultBalance;
      const newBalances = { ...prev.vaultBalances };
      if (key in newBalances) {
        newBalances[key] = Math.max(0, (newBalances[key] || 0) - amount);
      }
      const tx: VaultTx = {
        id:     `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        date:   new Date().toISOString(),
        type:   'Withdraw',
        token,
        amount,
      };
      return {
        ...prev,
        vaultBalances: newBalances,
        vaultActivity: [tx, ...prev.vaultActivity].slice(0, 50),
      };
    });
  }, []);

  const recordMatch = useCallback((match: Omit<MatchRecord, 'id'>) => {
    setData(prev => ({
      ...prev,
      matchHistory: [
        { ...match, id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` },
        ...prev.matchHistory,
      ].slice(0, 100),
    }));
  }, []);

  const totalDeposited = Object.values(data.vaultBalances).reduce((s, v) => s + v, 0);

  return {
    ...data,
    totalDeposited,
    recordDeposit,
    recordWithdraw,
    recordMatch,
  };
}
