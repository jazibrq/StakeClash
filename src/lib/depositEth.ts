import { BrowserProvider, parseEther } from "ethers";

const TREASURY      = (import.meta.env.VITE_TREASURY_EVM_ADDRESS as string | undefined)
  || "0x0d34Af40657D173b763Dd2CACD76300FF1F12485";
const BACKEND_URL   = "http://localhost:3001";
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111

export async function depositEth(amountEth: string): Promise<string> {
  const provider = new BrowserProvider((window as any).ethereum);

  await provider.send("wallet_switchEthereumChain", [{ chainId: SEPOLIA_CHAIN_ID }]);

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const value   = parseEther(amountEth);

  const tx = await signer.sendTransaction({ to: TREASURY, value });
  await tx.wait();

  // Tell the backend how much ETH this address deposited so it can refund the same amount.
  // Must succeed — without it the ETH refund won't fire.
  const backendRes = await fetch(`${BACKEND_URL}/record-eth-deposit`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ address, amountWei: value.toString() }),
  });
  if (!backendRes.ok) {
    throw new Error("ETH sent on-chain but backend failed to record the deposit. Is the backend running on port 3001?");
  }

  return tx.hash;
}
