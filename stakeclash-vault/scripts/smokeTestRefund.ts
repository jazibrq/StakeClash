import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ── Config ─────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS  = 5_000;   // 5 seconds
const TIMEOUT_MS        = 120_000; // 2 minutes
const DEPOSIT_HBAR      = "1";     // 1 HBAR

// ── Helpers ────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatBalance(wei: bigint): string {
  return ethers.formatEther(wei) + " HBAR";
}

function ts(seconds: bigint): string {
  return new Date(Number(seconds) * 1000).toISOString();
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  // 1. Load deployment address
  const vaultJsonPath = path.join(__dirname, "..", "deployments", "vault.json");
  if (!fs.existsSync(vaultJsonPath)) {
    throw new Error(
      "deployments/vault.json not found. Run deployVault.ts first:\n" +
      "  npx hardhat run scripts/deployVault.ts --network hederaTestnet"
    );
  }
  const { vault: vaultAddress } = JSON.parse(fs.readFileSync(vaultJsonPath, "utf8"));
  console.log("=".repeat(60));
  console.log("TimedRefundVault smoke test");
  console.log("Contract :", vaultAddress);
  console.log("=".repeat(60));

  // 2. Attach to contract
  const vault = await ethers.getContractAt("TimedRefundVault", vaultAddress);
  const [signer] = await ethers.getSigners();
  console.log("Signer   :", signer.address);

  // 3. Deposit
  const depositValue = ethers.parseEther(DEPOSIT_HBAR);
  console.log("\n── DEPOSIT ──────────────────────────────────────────────────");
  console.log(`Depositing ${DEPOSIT_HBAR} HBAR …`);

  const tx = await vault.connect(signer).depositAndScheduleRefund({ value: depositValue });
  console.log("Tx hash  :", tx.hash);
  const receipt = await tx.wait();
  console.log("Included in block:", receipt?.blockNumber);

  // 4. Read state immediately after deposit
  const balAfterDeposit = await ethers.provider.getBalance(vaultAddress);
  const depositor  = await vault.depositor();
  const amount     = await vault.amount();
  const refundTime = await vault.refundTime();
  const lastSched  = await vault.lastSchedule();

  console.log("\n── STATE AFTER DEPOSIT ──────────────────────────────────────");
  console.log("Contract balance :", formatBalance(balAfterDeposit));
  console.log("depositor        :", depositor);
  console.log("amount           :", formatBalance(amount));
  console.log("refundTime       :", ts(refundTime), `(unix ${refundTime})`);
  console.log("lastSchedule     :", lastSched);

  if (lastSched === ethers.ZeroAddress) {
    console.error("\n[FATAL] scheduleCall returned address(0).");
    console.error("Likely causes:");
    console.error("  • HSS precompile not available on this network/node version");
    console.error("  • Insufficient HBAR in contract to pay schedule fees");
    console.error("  • Wrong network (must be hederaTestnet, chainId 296)");
    process.exitCode = 1;
    return;
  }

  // 5. Poll
  console.log("\n── POLLING (every 5 s, max 120 s) ──────────────────────────");
  const deadline = Date.now() + TIMEOUT_MS;
  let elapsed = 0;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    elapsed += POLL_INTERVAL_MS;

    const isRefunded = await vault.refunded();
    const balNow     = await ethers.provider.getBalance(vaultAddress);

    console.log(
      `[+${String(elapsed / 1000).padStart(3)}s]  refunded=${isRefunded}  balance=${formatBalance(balNow)}`
    );

    if (isRefunded && balNow < balAfterDeposit) {
      console.log("\n" + "=".repeat(60));
      console.log("SUCCESS — refund executed automatically by HSS.");
      console.log(`Balance dropped: ${formatBalance(balAfterDeposit)} → ${formatBalance(balNow)}`);
      console.log("=".repeat(60));
      return;
    }
  }

  // 6. Timeout — print diagnostics
  const finalRefunded = await vault.refunded();
  const finalBal      = await ethers.provider.getBalance(vaultAddress);

  console.log("\n" + "=".repeat(60));
  console.log("FAILURE — refund was NOT executed within 120 seconds.");
  console.log(`refunded flag    : ${finalRefunded}`);
  console.log(`Contract balance : ${formatBalance(finalBal)}`);
  console.log("\nLikely causes:");
  console.log("  1. scheduleCall succeeded but schedule hasn't triggered yet");
  console.log("     (wait a little longer — Hedera consensus may be slow)");
  console.log("  2. Contract HBAR balance too low for schedule execution fee");
  console.log("     (send extra HBAR to the contract before depositing)");
  console.log("  3. GAS_LIMIT in contract too low for the scheduled refund()");
  console.log("     (increase GAS_LIMIT constant and redeploy)");
  console.log("  4. Wrong network — must be hederaTestnet (chainId 296)");
  console.log("  5. Hedera Schedule Service not yet supported on this node");
  console.log("=".repeat(60));
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
