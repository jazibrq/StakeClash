import { JsonRpcProvider, Wallet } from "ethers";

export async function sendEth(to: string, amountWei: bigint): Promise<string> {
  const provider = new JsonRpcProvider(process.env.ETH_RPC_URL);
  const wallet = new Wallet(process.env.ETH_PRIVATE_KEY!, provider);
  const tx = await wallet.sendTransaction({ to, value: amountWei });
  await tx.wait();
  console.log(tx.hash);
  return tx.hash;
}
