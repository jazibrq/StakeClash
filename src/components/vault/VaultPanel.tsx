/**
 * VaultPanel.tsx
 *
 * Drop-in panel that:
 *  - Checks Hedera Testnet (chainId 296)
 *  - Lets the user deposit HBAR
 *  - Polls vault state every 2 s, showing a live countdown
 *  - Flips to "Refund complete" when refunded == true
 *
 * Usage:
 *   <VaultPanel vaultAddress="0x..." />
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { checkNetwork, depositHBAR, readVaultState, type VaultState } from "@/lib/vault";

const POLL_MS = 2_000;

interface VaultPanelProps {
  vaultAddress: string;
}

export function VaultPanel({ vaultAddress }: VaultPanelProps) {
  const [amountInput, setAmountInput]   = useState("1");
  const [status, setStatus]             = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txHash, setTxHash]             = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [vaultState, setVaultState]     = useState<VaultState | null>(null);
  const [countdown, setCountdown]       = useState<number | null>(null);
  const intervalRef                     = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── poll vault state ─────────────────────────────────────────── */

  const poll = useCallback(async () => {
    try {
      const state = await readVaultState(vaultAddress);
      setVaultState(state);

      const now = Math.floor(Date.now() / 1000);
      const secs = Number(state.refundTime) - now;
      setCountdown(secs > 0 ? secs : 0);
    } catch {
      // silently ignore provider errors during polling
    }
  }, [vaultAddress]);

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, POLL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll]);

  /* ── network check on mount ───────────────────────────────────── */

  useEffect(() => {
    checkNetwork().catch((err: unknown) =>
      setNetworkError(err instanceof Error ? err.message : String(err))
    );
  }, []);

  /* ── deposit handler ──────────────────────────────────────────── */

  async function handleDeposit() {
    setNetworkError(null);
    setStatus("pending");
    try {
      await checkNetwork();
      const { txHash: hash } = await depositHBAR(vaultAddress, amountInput);
      setTxHash(hash);
      setStatus("success");
      poll(); // immediate refresh
    } catch (err: unknown) {
      setNetworkError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  /* ── derived display values ───────────────────────────────────── */

  const isRefunded    = vaultState?.refunded ?? false;
  const hasDeposit    = vaultState && !isRefunded && vaultState.refundTime > 0n;
  const countdownStr  =
    countdown !== null
      ? countdown > 0
        ? `${countdown}s`
        : "0s (awaiting HSS…)"
      : "—";

  /* ── render ───────────────────────────────────────────────────── */

  return (
    <div style={{ fontFamily: "monospace", maxWidth: 480, padding: 24, background: "#111", color: "#eee", borderRadius: 12 }}>
      <h2 style={{ marginTop: 0 }}>SimpleTimedRefundVault</h2>

      {/* network error */}
      {networkError && (
        <div style={{ background: "#3a0000", color: "#ff8080", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          {networkError}
        </div>
      )}

      {/* vault state */}
      <section style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
        <div><b>Contract balance:</b> {vaultState?.contractBalanceFormatted ?? "…"} HBAR</div>
        <div><b>Depositor:</b>        {vaultState?.depositor ?? "—"}</div>
        <div><b>Amount:</b>           {vaultState?.amountFormatted ?? "—"} HBAR</div>
        <div><b>Last schedule:</b>    {vaultState?.lastSchedule ?? "—"}</div>
        <div><b>refunded:</b>         {vaultState ? String(vaultState.refunded) : "—"}</div>

        {hasDeposit && (
          <div style={{ marginTop: 8, fontSize: 15, color: "#7cf", fontWeight: "bold" }}>
            Refund in: {countdownStr}
          </div>
        )}

        {isRefunded && (
          <div style={{ marginTop: 8, fontSize: 15, color: "#7f7", fontWeight: "bold" }}>
            Refund complete — funds returned to depositor.
          </div>
        )}
      </section>

      {/* deposit form */}
      {!hasDeposit && !isRefunded && (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            min="0"
            step="0.1"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            style={{ flex: 1, padding: "6px 10px", background: "#222", color: "#eee", border: "1px solid #444", borderRadius: 8, fontSize: 14 }}
            placeholder="HBAR amount"
          />
          <button
            onClick={handleDeposit}
            disabled={status === "pending"}
            style={{ padding: "6px 16px", background: "#0af", color: "#000", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer", fontSize: 14 }}
          >
            {status === "pending" ? "Waiting…" : "Deposit"}
          </button>
        </div>
      )}

      {/* tx hash */}
      {txHash && (
        <div style={{ marginTop: 12, fontSize: 12, color: "#aaa", wordBreak: "break-all" }}>
          tx: {txHash}
        </div>
      )}
    </div>
  );
}
