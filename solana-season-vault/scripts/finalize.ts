import { PublicKey } from "@solana/web3.js";
import { getProgram, seasonStatePda, vaultAuthorityPda, vaultPoolAta } from "./common";

async function main() {
  const program = getProgram();

  const STAKE_POOL = new PublicKey(process.env.STAKE_POOL!);
  const POOL_MINT = new PublicKey(process.env.POOL_MINT!);

  const seasonState = seasonStatePda(program.programId);
  const vaultAuthority = vaultAuthorityPda(program.programId, seasonState);
  const vaultPoolTokenAta = vaultPoolAta(vaultAuthority, POOL_MINT);

  const tx = await program.methods
    .finalize()
    .accounts({
      seasonState,
      vaultPoolTokenAta,
      stakePool: STAKE_POOL,
    })
    .rpc();

  console.log("finalize tx:", tx);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
