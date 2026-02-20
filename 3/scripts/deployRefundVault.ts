import { network } from "hardhat";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const { ethers } = await network.connect({ network: "hederaTestnet" });

const [deployer] = await ethers.getSigners();
console.log("Deploying from:", deployer.address);

const Vault = await ethers.getContractFactory("SimpleTimedRefundVault");
const vault = await Vault.deploy();
await vault.waitForDeployment();

const address = await vault.getAddress();
console.log("Vault deployed at:", address);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const deploymentsDir = path.join(__dirname, "..", "deployments");
mkdirSync(deploymentsDir, { recursive: true });

writeFileSync(
  path.join(deploymentsDir, "refundVault.json"),
  JSON.stringify({ vault: address, network: "hederaTestnet" }, null, 2)
);
console.log("Saved to deployments/refundVault.json");
