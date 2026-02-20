import { BrowserProvider, parseEther } from "ethers";

const HEDERA_TESTNET_CHAIN_ID = 296n;
const TREASURY_ADDRESS = import.meta.env.VITE_TREASURY_EVM_ADDRESS as string;

/**
 * Connects MetaMask, verifies Hedera Testnet (chainId 296),
 * sends native HBAR to the treasury EOA, and waits for confirmation.
 * Returns the transaction hash.
 */
export async function depositToTreasury(amountHbar: string): Promise<string> {
  if (!TREASURY_ADDRESS) {
    throw new Error(
      "VITE_TREASURY_EVM_ADDRESS is not set. Add it to your root .env file and restart the dev server."
    );
  }
  if (!window.ethereum) throw new Error("MetaMask not found");

  const provider = new BrowserProvider(window.ethereum);

  // getSigner() calls eth_requestAccounts internally — this is what triggers MetaMask
  const signer  = await provider.getSigner();
  const network = await provider.getNetwork();

  if (network.chainId !== HEDERA_TESTNET_CHAIN_ID) {
    throw new Error(
      `Wrong network (chainId ${network.chainId}). Switch to Hedera Testnet (chainId 296).`
    );
  }

  const tx = await signer.sendTransaction({
    to:    TREASURY_ADDRESS,
    value: parseEther(amountHbar),
  });

  await tx.wait();

  return tx.hash;
}
