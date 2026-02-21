import { BrowserProvider, Contract, parseUnits } from "ethers";

const TREASURY     = (import.meta.env.VITE_TREASURY_EVM_ADDRESS   as string | undefined) || "0x0d34Af40657D173b763Dd2CACD76300FF1F12485";
const USDC_ADDRESS = (import.meta.env.VITE_USDC_SEPOLIA_ADDRESS   as string | undefined) || "";
const SEPOLIA_CHAIN_ID = "0xaa36a7";
const USDC_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];

export async function depositUsdc(amount: string, onSending?: () => void): Promise<string> {
  const provider = new BrowserProvider((window as any).ethereum);
  await provider.send("wallet_switchEthereumChain", [{ chainId: SEPOLIA_CHAIN_ID }]);
  const signer = await provider.getSigner();
  const usdc = new Contract(USDC_ADDRESS, USDC_ABI, signer);
  const tx = await usdc.transfer(TREASURY, parseUnits(amount, 6));
  onSending?.();
  await tx.wait();
  return tx.hash;
}
