import { useState } from "react";
import { depositToTreasury } from "@/lib/vault";
import { useWalletContext } from "@/contexts/WalletContext";

export function VaultPanel() {
  const { isConnected, isHederaTestnet, switchToHederaTestnet } = useWalletContext();
  const [amount,  setAmount]  = useState("1");
  const [loading, setLoading] = useState(false);
  const [txHash,  setTxHash]  = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  async function handleDeposit() {
    setError(null);
    setTxHash(null);
    setLoading(true);
    try {
      if (!isHederaTestnet) {
        await switchToHederaTestnet();
        setError("Network switched. Click Deposit again.");
        return;
      }
      const hash = await depositToTreasury(amount);
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const btnLabel = !isConnected
    ? "Connect Wallet"
    : !isHederaTestnet
    ? "Switch to Hedera"
    : loading
    ? "Waiting…"
    : "Deposit";

  return (
    <div style={{ fontFamily: "monospace", maxWidth: 480, padding: 24, background: "#111", color: "#eee", borderRadius: 12 }}>
      <h2 style={{ marginTop: 0 }}>Deposit HBAR</h2>

      {error && (
        <div style={{ background: "#3a0000", color: "#ff8080", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="number"
          min="0"
          step="0.1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="HBAR amount"
          style={{ flex: 1, padding: "6px 10px", background: "#222", color: "#eee", border: "1px solid #444", borderRadius: 8, fontSize: 14 }}
        />
        <button
          onClick={handleDeposit}
          disabled={loading}
          style={{ padding: "6px 16px", background: "#0af", color: "#000", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer", fontSize: 14 }}
        >
          {btnLabel}
        </button>
      </div>

      {txHash && (
        <div style={{ marginTop: 12, fontSize: 12, color: "#aaa", wordBreak: "break-all" }}>
          tx: {txHash}
        </div>
      )}
    </div>
  );
}
