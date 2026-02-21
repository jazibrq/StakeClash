import { JsonRpcProvider, Wallet, Contract } from "ethers";

const USDC_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];

export async function sendUsdc(to: string, amountBaseUnits: bigint): Promise<string> {
  const provider = new JsonRpcProvider(process.env.ETH_RPC_URL);
  const wallet   = new Wallet(process.env.ETH_PRIVATE_KEY!, provider);
  const usdc     = new Contract(process.env.USDC_SEPOLIA_ADDRESS!, USDC_ABI, wallet);

  const tx = await usdc.transfer(to, amountBaseUnits);
  await tx.wait();
  console.log(tx.hash);
  return tx.hash;
}
