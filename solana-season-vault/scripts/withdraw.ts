import { PublicKey } from "@solana/web3.js";
import { getProgram, getProvider, seasonStatePda, userPositionPda, vaultAuthorityPda, vaultPoolAta } from "./common";

async function main() {
  const program = getProgram();
  const provider = getProvider();

  const POOL_MINT = new PublicKey(process.env.POOL_MINT!);

  const seasonState = seasonStatePda(program.programId);
  const userPosition = userPositionPda(program.programId, seasonState, provider.wallet.publicKey);
  const vaultAuthority = vaultAuthorityPda(program.programId, seasonState);
  const vaultPoolTokenAta = vaultPoolAta(vaultAuthority, POOL_MINT);

  const userPoolTokenAta = PublicKey.findProgramAddressSync(
    [
      provider.wallet.publicKey.toBuffer(),
      new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(),
      POOL_MINT.toBuffer(),
    ],
    new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
  )[0];

  const tx = await program.methods
    .withdraw()
    .accounts({
      user: provider.wallet.publicKey,
      seasonState,
      userPosition,
      vaultAuthority,
      vaultPoolTokenAta,
      poolMint: POOL_MINT,
      userPoolTokenAta,
    })
    .rpc();

  console.log("withdraw tx:", tx);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
