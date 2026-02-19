import { PublicKey } from "@solana/web3.js";
import { getProgram, getProvider, seasonStatePda, vaultAuthorityPda, vaultPoolAta, bn } from "./common";

async function main() {
  const program = getProgram();
  const provider = getProvider();

  const STAKE_POOL_PROGRAM_ID = new PublicKey(process.env.STAKE_POOL_PROGRAM_ID!);
  const STAKE_POOL = new PublicKey(process.env.STAKE_POOL!);
  const POOL_MINT = new PublicKey(process.env.POOL_MINT!);
  const GAME_ENGINE = new PublicKey(process.env.GAME_ENGINE!);

  const now = Math.floor(Date.now() / 1000);
  const depositStart = Number(process.env.DEPOSIT_START ?? now);
  const depositEnd = Number(process.env.DEPOSIT_END ?? now + 3600);
  const seasonEnd = Number(process.env.SEASON_END ?? now + 7200);

  const seasonState = seasonStatePda(program.programId);
  const vaultAuthority = vaultAuthorityPda(program.programId, seasonState);
  const vaultPoolTokenAta = vaultPoolAta(vaultAuthority, POOL_MINT);

  const tx = await program.methods
    .initializeSeason(bn(depositStart), bn(depositEnd), bn(seasonEnd), GAME_ENGINE)
    .accounts({
      owner: provider.wallet.publicKey,
      seasonState,
      vaultAuthority,
      vaultPoolTokenAta,
      stakePool: STAKE_POOL,
      stakePoolProgram: STAKE_POOL_PROGRAM_ID,
      poolMint: POOL_MINT,
    })
    .rpc();

  console.log("initialize tx:", tx);
  console.log("seasonState:", seasonState.toBase58());
  console.log("vaultAuthority:", vaultAuthority.toBase58());
  console.log("vaultPoolTokenAta:", vaultPoolTokenAta.toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
