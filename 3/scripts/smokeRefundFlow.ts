/**
 * smokeRefundFlow.ts
 *
 * End-to-end proof that Hedera Schedule Service automatically executes refund().
 * Does NOT call refund() manually — relies entirely on HSS.
 *
 * Run: npx hardhat run scripts/smokeRefundFlow.ts --network hederaTestnet
 */
import { network } from "hardhat";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { ethers } from "ethers";

/* ── load artifact + deployment ─────────────────────────────────── */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const artifactPath = path.join(
  __dirname,
  "..",
  "artifacts/contracts/SimpleTimedRefundVault.sol/SimpleTimedRefundVault.json"
);
const { abi } = JSON.parse(readFileSync(artifactPath, "utf8")) as { abi: ethers.InterfaceAbi };

const deploymentPath = path.join(__dirname, "..", "deployments", "refundVault.json");
const deployment = JSON.parse(readFileSync(deploymentPath, "utf8")) as { vault: string };
const VAULT_ADDRESS = deployment.vault;

/* ── connect ────────────────────────────────────────────────────── */

const { ethers: hreEthers } = await network.connect({ network: "hederaTestnet" });
const [deployer] = await hreEthers.getSigners();
const provider = hreEthers.provider;

console.log("─".repeat(60));
console.log("Deployer :", deployer.address);
console.log("Vault    :", VAULT_ADDRESS);

const startBalance = await provider.getBalance(deployer.address);
console.log("Start balance:", ethers.formatEther(startBalance), "HBAR");
console.log("─".repeat(60));

/* ── attach contract ────────────────────────────────────────────── */

const vault = new ethers.Contract(VAULT_ADDRESS, abi, deployer as unknown as ethers.Signer);

/* ── deposit 1 HBAR ─────────────────────────────────────────────── */

const ONE_HBAR = ethers.parseEther("1");
console.log("\nSending depositAndScheduleRefund (1 HBAR)…");

const depositTx = await vault.depositAndScheduleRefund({ value: ONE_HBAR });
const receipt = await depositTx.wait();

console.log("Deposit tx hash  :", depositTx.hash);

const contractBalance = await provider.getBalance(VAULT_ADDRESS);
console.log("Contract balance :", ethers.formatEther(contractBalance), "HBAR");

/* parse Deposited event */
const iface = new ethers.Interface(abi);
let refundTimeEmitted = 0n;
for (const log of receipt.logs) {
  try {
    const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
    if (parsed?.name === "Deposited") {
      refundTimeEmitted = parsed.args.refundTime as bigint;
      const ts = new Date(Number(refundTimeEmitted) * 1000).toISOString();
      console.log("Emitted refundTime:", refundTimeEmitted.toString(), `(${ts})`);
    }
    if (parsed?.name === "ScheduleCreated") {
      console.log("Schedule address :", parsed.args.scheduleAddress);
    }
  } catch {
    // ignore unrelated logs
  }
}

const lastSchedule = await vault.lastSchedule();
console.log("lastSchedule     :", lastSchedule);

/* ── poll until refunded or 90 s timeout ────────────────────────── */

console.log("\nPolling every 5 s for up to 90 s (HSS will call refund() automatically)…");
console.log("─".repeat(60));

const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_MS = 90_000;
const deadline = Date.now() + TIMEOUT_MS;

let refundDetected = false;

while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

  const now = BigInt(Math.floor(Date.now() / 1000));
  const secsLeft = refundTimeEmitted > 0n ? refundTimeEmitted - now : 0n;

  const vaultBal = await provider.getBalance(VAULT_ADDRESS);
  const isRefunded: boolean = await vault.refunded();

  console.log(
    `[${new Date().toISOString()}]  refunded=${isRefunded}  vaultBal=${ethers.formatEther(vaultBal)} HBAR  secsUntilRefund=${secsLeft > 0n ? secsLeft.toString() : "0"}s`
  );

  if (isRefunded) {
    refundDetected = true;
    break;
  }
}

/* ── assertions ─────────────────────────────────────────────────── */

console.log("─".repeat(60));

if (!refundDetected) {
  console.error("FAIL: refunded never became true within 90 s");
  process.exit(1);
}

const finalVaultBal = await provider.getBalance(VAULT_ADDRESS);
if (finalVaultBal > ethers.parseEther("0.01")) {
  console.error(
    `FAIL: contract still holds ${ethers.formatEther(finalVaultBal)} HBAR after refund`
  );
  process.exit(1);
}

const endBalance = await provider.getBalance(deployer.address);
console.log("End balance  :", ethers.formatEther(endBalance), "HBAR");
console.log(
  "Balance delta:",
  ethers.formatEther(endBalance - startBalance),
  "HBAR (negative = gas spent; should be close to 0 after refund)"
);
console.log("\nPASS: HSS executed refund() automatically. Funds returned to deployer.");
