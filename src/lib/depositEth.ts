import { BrowserProvider, parseEther } from "ethers";

const TREASURY = import.meta.env.VITE_TREASURY_EVM_ADDRESS as string;
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111

export async function depositEth(amountEth: string): Promise<string> {
  const provider = new BrowserProvider((window as any).ethereum);

  await provider.send("wallet_switchEthereumChain", [{ chainId: SEPOLIA_CHAIN_ID }]);

  const signer = await provider.getSigner();
  const tx = await signer.sendTransaction({
    to: TREASURY,
    value: parseEther(amountEth),
  });

  await tx.wait();
  return tx.hash;
}
