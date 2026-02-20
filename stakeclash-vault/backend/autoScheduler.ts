import * as dotenv from "dotenv";
dotenv.config();

import {
  Client,
  AccountId,
  PrivateKey,
  Hbar,
  TransferTransaction,
  ScheduleCreateTransaction,
  Timestamp,
} from "@hashgraph/sdk";

// ── Env guards ─────────────────────────────────────────────────────────────
if (!process.env.OPERATOR_ID)         throw new Error("Missing OPERATOR_ID in .env");
if (!process.env.OPERATOR_KEY)        throw new Error("Missing OPERATOR_KEY in .env");
if (!process.env.TREASURY_ACCOUNT_ID) throw new Error("Missing TREASURY_ACCOUNT_ID in .env");

console.log("Loaded ENV:", {
  OPERATOR_ID:         process.env.OPERATOR_ID,
  TREASURY_ACCOUNT_ID: process.env.TREASURY_ACCOUNT_ID,
});

// ── Config ─────────────────────────────────────────────────────────────────
const NETWORK          = process.env.HEDERA_NETWORK || "testnet";
const OPERATOR_ID      = AccountId.fromString(process.env.OPERATOR_ID);
const OPERATOR_KEY     = PrivateKey.fromString(process.env.OPERATOR_KEY);
const TREASURY_ID      = AccountId.fromString(process.env.TREASURY_ACCOUNT_ID);
const POLL_INTERVAL_MS = 5_000;
const REFUND_DELAY_S   = 60;

const MIRROR_BASE = NETWORK === "mainnet"
  ? "https://mainnet-public.mirrornode.hedera.com"
  : "https://testnet.mirrornode.hedera.com";

// ── Hedera client ──────────────────────────────────────────────────────────
const client = NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();
client.setOperator(OPERATOR_ID, OPERATOR_KEY);

// ── Processed tx tracker ───────────────────────────────────────────────────
const processed = new Set<string>();

// ── Types ──────────────────────────────────────────────────────────────────
interface HbarTransfer { account: string; amount: number; is_approval: boolean; }
interface MirrorTx {
  transaction_id: string;
  result: string;
  transfers: HbarTransfer[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
async function getEvmAddress(accountId: string): Promise<string> {
  const res  = await fetch(`${MIRROR_BASE}/api/v1/accounts/${accountId}`);
  const data = await res.json() as { evm_address?: string };
  return data.evm_address ?? accountId;
}

async function scheduleRefund(depositorId: AccountId, tinybars: number): Promise<string> {
  const inner = new TransferTransaction()
    .addHbarTransfer(TREASURY_ID,  Hbar.fromTinybars(-tinybars))
    .addHbarTransfer(depositorId,  Hbar.fromTinybars(tinybars));

  const expiry = Timestamp.fromDate(new Date(Date.now() + REFUND_DELAY_S * 1000));

  const response = await new ScheduleCreateTransaction()
    .setScheduledTransaction(inner)
    .setWaitForExpiry(true)
    .setExpirationTime(expiry)
    .execute(client);

  const receipt = await response.getReceipt(client);
  return receipt.scheduleId!.toString();
}

// ── Poll ───────────────────────────────────────────────────────────────────
async function poll(): Promise<void> {
  try {
    const url = `${MIRROR_BASE}/api/v1/transactions`
      + `?account.id=${TREASURY_ID}&transactiontype=CRYPTOTRANSFER&limit=10&order=desc`;

    const res = await fetch(url);
    const { transactions = [] } = await res.json() as { transactions?: MirrorTx[] };

    for (const tx of transactions) {
      if (tx.result !== "SUCCESS")              continue;
      if (processed.has(tx.transaction_id))     continue;

      // Treasury must have received HBAR in this tx
      const treasuryIn = tx.transfers.find(
        t => t.account === TREASURY_ID.toString() && t.amount > 0
      );
      if (!treasuryIn) continue;

      // Depositor: negative amount, not treasury, not system account (num >= 1000)
      const depositorTransfer = tx.transfers.find(t => {
        if (t.amount >= 0 || t.account === TREASURY_ID.toString()) return false;
        return parseInt(t.account.split(".")[2], 10) >= 1000;
      });
      if (!depositorTransfer) continue;

      processed.add(tx.transaction_id);

      const depositorId = AccountId.fromString(depositorTransfer.account);
      const evmAddress  = await getEvmAddress(depositorTransfer.account);
      const hbarAmount  = (treasuryIn.amount / 1e8).toFixed(4);

      const scheduleId = await scheduleRefund(depositorId, treasuryIn.amount);

      console.log(`Scheduled refund for ${hbarAmount} HBAR to ${evmAddress}`);
      console.log(`scheduleId: ${scheduleId}`);
    }
  } catch (err) {
    console.error("Poll error:", (err as Error).message);
  }

  setTimeout(poll, POLL_INTERVAL_MS);
}

// ── Start ──────────────────────────────────────────────────────────────────
console.log(`autoScheduler started — watching ${TREASURY_ID} on ${NETWORK}`);
void poll();
