import { PublicKey } from "@solana/web3.js";
import { getProgram, getProvider, seasonStatePda, userPositionPda, vaultAuthorityPda, vaultPoolAta, bn } from "./common";

/**
 * deposit.ts
 *
 * IMPORTANT: `stakePoolDepositIxData` must be the serialized SPL stake-pool
 * deposit_sol instruction bytes for your target stake pool.
 *
 * Build this off-chain with an SPL stake-pool client and pass all required
 * accounts in `remainingAccounts` in exact stake-pool expected order.
 */
async function main() {
  const program = getProgram();
  const provider = getProvider();

  const amountLamports = BigInt(process.env.AMOUNT_LAMPORTS ?? "1000000000");
  const STAKE_POOL_PROGRAM_ID = new PublicKey(process.env.STAKE_POOL_PROGRAM_ID!);
  const STAKE_POOL = new PublicKey(process.env.STAKE_POOL!);
  const POOL_MINT = new PublicKey(process.env.POOL_MINT!);

  const seasonState = seasonStatePda(program.programId);
  const vaultAuthority = vaultAuthorityPda(program.programId, seasonState);
  const vaultPoolTokenAta = vaultPoolAta(vaultAuthority, POOL_MINT);
  const userPosition = userPositionPda(program.programId, seasonState, provider.wallet.publicKey);

  const stakePoolDepositIxDataHex = process.env.STAKE_POOL_DEPOSIT_IX_DATA_HEX;
  if (!stakePoolDepositIxDataHex) {
    throw new Error("Missing STAKE_POOL_DEPOSIT_IX_DATA_HEX");
  }
  const stakePoolDepositIxData = Buffer.from(stakePoolDepositIxDataHex.replace(/^0x/, ""), "hex");

  // TODO: replace with full stake-pool account metas required by deposit_sol.
  const remainingAccounts: Array<{ pubkey: any; isWritable: boolean; isSigner: boolean }> = [];

  const tx = await program.methods
    .depositSol(bn(amountLamports), [...stakePoolDepositIxData])
    .accounts({
      user: provider.wallet.publicKey,
      seasonState,
      userPosition,
      vaultPoolTokenAta,
      stakePool: STAKE_POOL,
      stakePoolProgram: STAKE_POOL_PROGRAM_ID,
    })
    .remainingAccounts(remainingAccounts)
    .rpc();

  console.log("deposit tx:", tx);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
