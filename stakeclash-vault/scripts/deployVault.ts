import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const Factory = await ethers.getContractFactory("TimedRefundVault");
  const vault = await Factory.deploy();
  await vault.waitForDeployment();

  const address = await vault.getAddress();
  console.log("TimedRefundVault deployed:", address);

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentsDir, "vault.json"),
    JSON.stringify({ vault: address }, null, 2)
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
