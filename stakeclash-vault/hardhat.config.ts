import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// ── Key validation ────────────────────────────────────────────────────────────
const rawKey = process.env.DEPLOYER_PRIVATE_KEY;

// Only enforce when actually connecting to a live network (not during compile).
// The check runs at config-load time, so we skip it for hardhat's built-in tasks
// that don't require a signer (compile, clean, etc.) by checking argv.
const needsSigner = process.argv.some((arg) =>
  ["--network", "run", "deploy"].includes(arg)
);

if (needsSigner) {
  if (!rawKey || rawKey.trim() === "") {
    throw new Error(
      "\n[hardhat.config] DEPLOYER_PRIVATE_KEY is not set.\n" +
      "  1. Copy .env.example → .env\n" +
      "  2. Paste your 64-character hex private key (WITHOUT the 0x prefix)\n" +
      "  3. Re-run the command.\n"
    );
  }
  if (rawKey.startsWith("0x") || rawKey.startsWith("0X")) {
    throw new Error(
      "\n[hardhat.config] DEPLOYER_PRIVATE_KEY must NOT include the 0x prefix.\n" +
      "  Remove the leading '0x' from the key in your .env file.\n"
    );
  }
}

const accounts = rawKey && rawKey.trim() !== "" ? [`0x${rawKey}`] : [];

// ── Config ────────────────────────────────────────────────────────────────────
const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hederaTestnet: {
      url: process.env.HEDERA_TESTNET_RPC || "https://testnet.hashio.io/api",
      chainId: 296,
      accounts,
    },
  },
};

export default config;
