import { BrowserProvider, parseEther } from "ethers";

const TREASURY      = import.meta.env.VITE_TREASURY_EVM_ADDRESS as string;
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
  // Fire-and-forget — backend being down must not fail the deposit.
  fetch(`${BACKEND_URL}/record-eth-deposit`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ address, amountWei: value.toString() }),
  }).catch(err => console.warn("[depositEth] Failed to record deposit on backend:", err));

  return tx.hash;
}
