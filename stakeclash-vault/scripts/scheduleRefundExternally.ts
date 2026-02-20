import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Hedera Schedule Service system-contract (EOA-callable, no signature restriction)
const HSS_ADDRESS = "0x000000000000000000000000000000000000016b";
const HSS_ABI = [
  "function scheduleCall(address to, uint256 gasLimit, uint256 value, uint64 expirySecond, bytes calldata data) external returns (int64 responseCode, address scheduleAddress)",
];
const GAS_LIMIT = 1_500_000;
const DELAY_SECONDS = 120;

async function main() {
  // Load vault address
  const { vault: vaultAddress } = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", "vault.json"), "utf8")
  );

  // Encode refund() selector
  const refundData = new ethers.Interface(["function refund()"]).encodeFunctionData("refund");

  // Compute expiry from latest block timestamp
  const block = await ethers.provider.getBlock("latest");
  const expirySecond = BigInt(block!.timestamp + DELAY_SECONDS);

  const [signer] = await ethers.getSigners();
  const hss = new ethers.Contract(HSS_ADDRESS, HSS_ABI, signer);

  // Static-call first to read return values
  const [responseCode, scheduleAddress] = await hss.scheduleCall.staticCall(
    vaultAddress,
    GAS_LIMIT,
    0,
    expirySecond,
    refundData
  );

  // Send the actual transaction
  const tx = await hss.scheduleCall(vaultAddress, GAS_LIMIT, 0, expirySecond, refundData);
  await tx.wait();

  console.log("responseCode   :", responseCode.toString());
  console.log("scheduleAddress:", scheduleAddress);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
