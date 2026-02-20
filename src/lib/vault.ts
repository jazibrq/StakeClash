/**
 * vault.ts – ethers v6 helpers for SimpleTimedRefundVault on Hedera Testnet
 *
 * Usage:
 *   import { checkNetwork, depositHBAR, readVaultState } from "@/lib/vault";
 */
import { BrowserProvider, Contract, parseEther, formatEther } from "ethers";

/* ── Hedera Testnet chain ID ─────────────────────────────────────── */

export const HEDERA_TESTNET_CHAIN_ID = 296;

/* ── Minimal ABI (only what the UI needs) ────────────────────────── */

const VAULT_ABI = [
  // state readers
  "function depositor() view returns (address)",
  "function amount() view returns (uint256)",
  "function refundTime() view returns (uint64)",
  "function refunded() view returns (bool)",
  "function lastSchedule() view returns (address)",
  // write
  "function depositAndScheduleRefund() payable",
  // events
  "event Deposited(address indexed user, uint256 amount, uint64 refundTime)",
  "event Refunded(address indexed user, uint256 amount)",
];

/* ── Network check ───────────────────────────────────────────────── */

/**
 * Asserts the connected wallet is on Hedera Testnet (chainId 296).
 * Throws a user-readable error if not.
 */
export async function checkNetwork(): Promise<void> {
  if (!window.ethereum) throw new Error("MetaMask not found");
  const provider = new BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== HEDERA_TESTNET_CHAIN_ID) {
    throw new Error(
      `Wrong network (chainId ${network.chainId}). Please switch to Hedera Testnet (chainId 296).`
    );
  }
}

/* ── depositHBAR ─────────────────────────────────────────────────── */

export interface DepositResult {
  txHash: string;
  refundTime: bigint; // unix seconds
}

/**
 * Deposits native HBAR to the vault and schedules an automatic refund.
 *
 * @param vaultAddress - deployed SimpleTimedRefundVault address
 * @param amountHBAR   - amount in HBAR as a decimal string, e.g. "1" or "0.5"
 */
export async function depositHBAR(
  vaultAddress: string,
  amountHBAR: string
): Promise<DepositResult> {
  await checkNetwork();

  const provider = new BrowserProvider(window.ethereum!);
  const signer = await provider.getSigner();
  const vault = new Contract(vaultAddress, VAULT_ABI, signer);

  const tx = await vault.depositAndScheduleRefund({ value: parseEther(amountHBAR) });
  const receipt = await tx.wait();

  // Decode the Deposited event to extract refundTime
  let refundTime = 0n;
  const iface = vault.interface;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (parsed?.name === "Deposited") {
        refundTime = parsed.args.refundTime as bigint;
      }
    } catch {
      // skip unrelated logs
    }
  }

  return { txHash: tx.hash as string, refundTime };
}

/* ── readVaultState ──────────────────────────────────────────────── */

export interface VaultState {
  depositor: string;
  amount: bigint;         // wei (1 HBAR = 1e18 wei in Hedera EVM)
  amountFormatted: string; // human-readable HBAR string
  refundTime: bigint;     // unix seconds
  refunded: boolean;
  lastSchedule: string;
  contractBalance: bigint;
  contractBalanceFormatted: string;
}

/**
 * Reads all relevant vault state + contract ETH balance in one call.
 * Safe to call on an interval — uses read-only provider if MetaMask is present.
 */
export async function readVaultState(vaultAddress: string): Promise<VaultState> {
  const provider = new BrowserProvider(window.ethereum!);
  const vault = new Contract(vaultAddress, VAULT_ABI, provider);

  const [depositor, amount, refundTime, refunded, lastSchedule, contractBalance] =
    await Promise.all([
      vault.depositor() as Promise<string>,
      vault.amount() as Promise<bigint>,
      vault.refundTime() as Promise<bigint>,
      vault.refunded() as Promise<boolean>,
      vault.lastSchedule() as Promise<string>,
      provider.getBalance(vaultAddress),
    ]);

  return {
    depositor,
    amount,
    amountFormatted: formatEther(amount),
    refundTime,
    refunded,
    lastSchedule,
    contractBalance,
    contractBalanceFormatted: formatEther(contractBalance),
  };
}

/* ── Button-click example (inline snippet) ───────────────────────── */
/*

  import { depositHBAR, checkNetwork } from "@/lib/vault";
  import { VAULT_ADDRESS } from "@/constants"; // your deployed address

  async function handleDeposit() {
    try {
      await checkNetwork();                              // 1. verify Hedera Testnet
      const { txHash, refundTime } = await depositHBAR(VAULT_ADDRESS, "1");
      console.log("tx hash   :", txHash);
      console.log("refund at :", new Date(Number(refundTime) * 1000).toISOString());
    } catch (err) {
      alert(String(err));
    }
  }

  <button onClick={handleDeposit}>Deposit 1 HBAR</button>

*/
