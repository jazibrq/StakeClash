import * as dotenv from "dotenv";
dotenv.config();

import * as http from "http";
import * as fs from "fs";
import * as path from "path";

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

console.log("[INIT] Loaded ENV:", {
  OPERATOR_ID:         process.env.OPERATOR_ID,
  TREASURY_ACCOUNT_ID: process.env.TREASURY_ACCOUNT_ID,
});
console.log("[INIT] ETH_RPC_URL defined:", !!process.env.ETH_RPC_URL);
console.log("[INIT] ETH_PRIVATE_KEY defined:", !!process.env.ETH_PRIVATE_KEY);

// ── Config ─────────────────────────────────────────────────────────────────
const NETWORK                 = process.env.HEDERA_NETWORK || "testnet";
const OPERATOR_ID             = AccountId.fromString(process.env.OPERATOR_ID);
const OPERATOR_KEY            = PrivateKey.fromStringECDSA(process.env.OPERATOR_KEY);
const TREASURY_ID             = AccountId.fromString(process.env.TREASURY_ACCOUNT_ID);
const POLL_INTERVAL_MS        = 5_000;
const SCHEDULE_EXPIRY_SECONDS = 60;    // 1 minute — Hedera executes at expiry
const HTTP_PORT               = Number(process.env.HTTP_PORT ?? 3001);

const MIRROR_BASE = NETWORK === "mainnet"
  ? "https://mainnet-public.mirrornode.hedera.com"
  : "https://testnet.mirrornode.hedera.com";

// ── Hedera client ──────────────────────────────────────────────────────────
const client = NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();
client.setOperator(OPERATOR_ID, OPERATOR_KEY);

// ── Startup timestamp — only process txs from this point forward ───────────
const START_TIMESTAMP = `${Math.floor(Date.now() / 1000)}.000000000`;

// ── Processed tx tracker ───────────────────────────────────────────────────
const processed = new Set<string>();

// ── Types ──────────────────────────────────────────────────────────────────
interface HbarTransfer { account: string; amount: number; is_approval: boolean; }
interface MirrorTx {
  transaction_id: string;
  result:         string;
  transfers:      HbarTransfer[];
}

// ── Season state ───────────────────────────────────────────────────────────
// Unix timestamp (seconds) when the current season's schedules expire.
// null means no season is active.
let seasonExpiresAt: number | null = null;

// ── In-Memory Deposit Store ────────────────────────────────────────────────
// Deposits are stored here when detected; nothing is scheduled until
// /start-season is called. Key = unique deposit identifier.
interface Deposit {
  userId:          AccountId;
  amountTinybars:  number;
}
const deposits = new Map<string, Deposit>();

// ── Helpers ────────────────────────────────────────────────────────────────
async function getEvmAddress(accountId: string): Promise<string> {
  const res  = await fetch(`${MIRROR_BASE}/api/v1/accounts/${accountId}`);
  const data = await res.json() as { evm_address?: string };
  return data.evm_address ?? accountId;
}

/**
 * Stores a detected deposit in memory.
 * Does NOT schedule anything — scheduling happens only at season start.
 */
function storeDeposit(depositorId: AccountId, tinybars: number): string {
  const key = `deposit-${depositorId.toString()}-${Date.now()}`;
  deposits.set(key, { userId: depositorId, amountTinybars: tinybars });
  console.log(`[STORE] Deposit queued — key: ${key}, account: ${depositorId}, tinybars: ${tinybars}`);
  return key;
}

/**
 * Schedules a single refund via Hedera Schedule Service.
 *
 * Flow:
 *  1. Build inner TransferTransaction (do NOT freeze or sign manually —
 *     ScheduleCreateTransaction owns the inner tx lifecycle entirely).
 *  2. Wrap in ScheduleCreateTransaction with:
 *       - setWaitForExpiry(true)  → executes at expiry regardless of signature state
 *       - setExpirationTime(...)  → 5 minutes from now
 *  3. execute(client) submits the ScheduleCreateTransaction.
 *     The Hedera SDK automatically signs the OUTER ScheduleCreateTransaction
 *     with the operator key. Crucially, because the operator (OPERATOR_ID) is
 *     also the treasury account that signs the INNER TransferTransaction,
 *     the SDK also attaches that signature to the schedule's initial payload
 *     in the same gRPC call.
 *
 * Why ScheduleSignTransaction is NOT called here:
 *   The inner TransferTransaction debits TREASURY_ID, so the treasury key is
 *   the only required signer. That key IS the operator key. The SDK bundles
 *   the operator signature into ScheduleCreateTransaction automatically —
 *   by the time the call completes, all required signatures are already
 *   on-chain. Calling ScheduleSignTransaction after this would attempt to
 *   add the same key again, which Hedera rejects with NO_NEW_VALID_SIGNATURES.
 *
 *   TL;DR: operator == treasury → single signer → already signed at creation.
 *   Do not call ScheduleSignTransaction.
 */
async function scheduleOneRefund(depositKey: string, deposit: Deposit): Promise<void> {
  const { userId, amountTinybars } = deposit;

  // Step 1 — Inner transfer: treasury → depositor.
  // Do NOT call .freeze() or .sign() here. ScheduleCreateTransaction handles
  // the inner tx — manually freezing it will make it immutable and break signing.
  const innerTx = new TransferTransaction()
    .addHbarTransfer(TREASURY_ID, Hbar.fromTinybars(-amountTinybars))
    .addHbarTransfer(userId,      Hbar.fromTinybars(amountTinybars));

  // Step 2 & 3 — Create the schedule.
  // The SDK signs the outer ScheduleCreateTransaction with the operator key AND
  // simultaneously provides the operator key as a signature for the inner tx.
  // No further signing step is required.
  const expiryUnixSec = Math.floor(Date.now() / 1000) + SCHEDULE_EXPIRY_SECONDS;

  const scheduleCreateResponse = await new ScheduleCreateTransaction()
    .setScheduledTransaction(innerTx)
    .setWaitForExpiry(true)                              // hold until expiry even though fully signed
    .setExpirationTime(new Timestamp(expiryUnixSec, 0)) // 5 minutes from now
    .execute(client);

  const createReceipt = await scheduleCreateResponse.getReceipt(client);
  const scheduleId    = createReceipt.scheduleId;
  console.log(`[SCHEDULE] Schedule ID: ${scheduleId?.toString()}`);
  console.log(
    `[SCHEDULE] Created ${scheduleId} for deposit ${depositKey}. ` +
    `Refund of ${(amountTinybars / 1e8).toFixed(4)} HBAR to ${userId} ` +
    `will auto-execute at expiry (~1 min). No ScheduleSignTransaction needed ` +
    `(operator == treasury, signature already included at creation).`
  );
}

/**
 * Iterates all pending deposits, schedules each refund via Hedera Schedule
 * Service, then clears the deposit map. Called by the /start-season endpoint.
 */
async function startSeason(): Promise<{ scheduled: number; errors: string[] }> {
  if (deposits.size === 0) {
    console.log("[SEASON] No deposits pending — nothing to schedule.");
    return { scheduled: 0, errors: [] };
  }

  console.log(`[SEASON] Starting season — ${deposits.size} deposit(s) to schedule...`);

  // Snapshot and clear upfront to prevent double-scheduling if the endpoint
  // is called again while this async loop is still running.
  const snapshot = new Map(deposits);
  deposits.clear();

  const errors: string[] = [];
  let scheduled = 0;

  for (const [depositKey, deposit] of snapshot) {
    try {
      await scheduleOneRefund(depositKey, deposit);
      scheduled++;
    } catch (err) {
      const msg = `Failed to schedule ${depositKey}: ${(err as Error).message}`;
      console.error(`[SEASON] ${msg}`);
      errors.push(msg);
      // Re-queue failed deposit so it can be retried on the next season call
      deposits.set(depositKey, deposit);
    }
  }

  // Record when the scheduled transactions will expire so the frontend
  // countdown can be driven by the real Hedera expiry time.
  if (scheduled > 0) {
    seasonExpiresAt = Math.floor(Date.now() / 1000) + SCHEDULE_EXPIRY_SECONDS;
  }

  console.log(`[SEASON] Complete — ${scheduled} scheduled, ${errors.length} error(s).`);
  return { scheduled, errors };
}

// ── Poll mirror node for incoming deposits ─────────────────────────────────
async function poll(): Promise<void> {
  try {
    const url =
      `${MIRROR_BASE}/api/v1/transactions` +
      `?account.id=${TREASURY_ID}&order=asc&limit=25&timestamp=gte:${START_TIMESTAMP}`;

    const res = await fetch(url);
    const { transactions = [] } = await res.json() as { transactions?: MirrorTx[] };

    for (const tx of transactions) {
      if (tx.result !== "SUCCESS")          continue;
      if (processed.has(tx.transaction_id)) continue;

      // Treasury must have received HBAR
      const treasuryIn = tx.transfers.find(
        t => t.account === TREASURY_ID.toString() && t.amount > 0
      );
      if (!treasuryIn) continue;

      // Depositor: negative amount, not treasury, not a system account (num ≥ 1000)
      const depositorTransfer = tx.transfers.find(t => {
        if (t.amount >= 0 || t.account === TREASURY_ID.toString()) return false;
        return parseInt(t.account.split(".")[2], 10) >= 1000;
      });
      if (!depositorTransfer) continue;

      processed.add(tx.transaction_id);

      const depositorId = AccountId.fromString(depositorTransfer.account);
      const evmAddress  = await getEvmAddress(depositorTransfer.account);
      const hbarAmount  = (treasuryIn.amount / 1e8).toFixed(4);

      console.log(
        `[POLL] Deposit detected — account: ${depositorTransfer.account} (${evmAddress}), ` +
        `amount: ${hbarAmount} HBAR (${treasuryIn.amount} tinybars)`
      );

      // Store deposit; do NOT schedule yet — that happens at season start
      const depositKey = storeDeposit(depositorId, treasuryIn.amount);
      console.log(`[POLL] Stored as ${depositKey}. Total pending: ${deposits.size}`);
    }
  } catch (err) {
    console.error("[POLL] Error:", (err as Error).message);
  }

  setTimeout(poll, POLL_INTERVAL_MS);
}

// ── HTTP server ────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${HTTP_PORT}`);

  // CORS — allow the frontend to call from any origin in dev
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /start-season — trigger Hedera scheduling for all pending deposits
  if (req.method === "GET" && url.pathname === "/start-season") {
    try {
      const result = await startSeason();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, ...result }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: (err as Error).message }));
    }
    return;
  }

  // GET /season-status — current season countdown for the React frontend
  if (req.method === "GET" && url.pathname === "/season-status") {
    const now = Math.floor(Date.now() / 1000);
    const active = seasonExpiresAt !== null && seasonExpiresAt > now;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      active,
      expiresAt:     active ? seasonExpiresAt : null,
      secondsLeft:   active ? seasonExpiresAt! - now : 0,
    }));
    return;
  }

  // GET /deposits — inspect pending deposit queue
  if (req.method === "GET" && url.pathname === "/deposits") {
    const list = Array.from(deposits.entries()).map(([key, d]) => ({
      key,
      userId:         d.userId.toString(),
      amountTinybars: d.amountTinybars,
      hbar:           (d.amountTinybars / 1e8).toFixed(4),
    }));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ count: list.length, deposits: list }));
    return;
  }

  // GET / — serve the admin frontend
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    const htmlPath = path.join(__dirname, "public", "index.html");
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      fs.createReadStream(htmlPath).pipe(res as NodeJS.WritableStream);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Frontend not found — place index.html in backend/public/");
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(HTTP_PORT, () => {
  console.log(`[HTTP] Admin server → http://localhost:${HTTP_PORT}`);
  console.log(`[HTTP]   GET /              — admin UI`);
  console.log(`[HTTP]   GET /start-season  — schedule all pending refunds`);
  console.log(`[HTTP]   GET /season-status — season countdown (polled by React app)`);
  console.log(`[HTTP]   GET /deposits      — view pending deposit queue`);
});

// ── Start ──────────────────────────────────────────────────────────────────
console.log(`[INIT] autoScheduler started — watching ${TREASURY_ID} on ${NETWORK}`);
void poll();
