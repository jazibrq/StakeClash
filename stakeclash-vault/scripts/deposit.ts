import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const { vault: address } = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", "vault.json"), "utf8")
  );
  const vault = await ethers.getContractAt("TimedRefundVault", address);
  const tx = await vault.deposit({ value: ethers.parseEther("1") });
  await tx.wait();
  console.log("Deposit complete");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
