import { ethers, network } from "hardhat";

async function main() {
  // ── Network ─────────────────────────────────────────────────────────────
  const chainId = (await ethers.provider.getNetwork()).chainId;
  console.log("=".repeat(50));
  console.log("Network  :", network.name);
  console.log("Chain ID :", chainId.toString());

  // ── Signer ──────────────────────────────────────────────────────────────
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      "No signers available.\n" +
      "  Ensure DEPLOYER_PRIVATE_KEY is set in .env (without 0x prefix)."
    );
  }

  const signer = signers[0];
  const address = await signer.getAddress();
  console.log("Signer   :", address);

  // ── Balance ─────────────────────────────────────────────────────────────
  const balance = await ethers.provider.getBalance(address);
  console.log("Balance  :", ethers.formatEther(balance), "HBAR");
  console.log("=".repeat(50));

  if (balance === 0n) {
    throw new Error(
      "Signer balance is 0.\n" +
      "  Fund the account at https://portal.hedera.com (testnet faucet)\n" +
      "  then re-run this script."
    );
  }

  console.log("OK — signer is funded and ready.");
}

main().catch((err) => {
  console.error("\n[checkSigner] ERROR:", err.message ?? err);
  process.exitCode = 1;
});
