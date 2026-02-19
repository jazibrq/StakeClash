import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { describe, it } from "mocha";
import { PublicKey, Keypair } from "@solana/web3.js";
import { airdrop, getProgram, getProvider, seasonStatePda, userPositionPda, vaultAuthorityPda, vaultPoolAta, bn } from "../scripts/common";

describe("season_vault", () => {
  const provider = getProvider();
  anchor.setProvider(provider);
  const program = getProgram();

  const seasonState = seasonStatePda(program.programId);

  const stakePoolProgramId = new PublicKey(process.env.STAKE_POOL_PROGRAM_ID || "SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy");
  const stakePool = new PublicKey(process.env.STAKE_POOL!);
  const poolMint = new PublicKey(process.env.POOL_MINT!);

  const user = Keypair.generate();

  it("airdrops SOL to user", async () => {
    await airdrop(provider.connection, user.publicKey, 2);
    const bal = await provider.connection.getBalance(user.publicKey);
    expect(bal).to.be.greaterThan(0);
  });

  it("initializes season", async () => {
    const now = Math.floor(Date.now() / 1000);
    const depositStart = now;
    const depositEnd = now + 600;
    const seasonEnd = now + 1200;

    const vaultAuthority = vaultAuthorityPda(program.programId, seasonState);
    const vaultPoolTokenAta = vaultPoolAta(vaultAuthority, poolMint);

    await program.methods
      .initializeSeason(bn(depositStart), bn(depositEnd), bn(seasonEnd), provider.wallet.publicKey)
      .accounts({
        owner: provider.wallet.publicKey,
        seasonState,
        vaultAuthority,
        vaultPoolTokenAta,
        stakePool,
        stakePoolProgram: stakePoolProgramId,
        poolMint,
      })
      .rpc();

    const state = await program.account.seasonState.fetch(seasonState);
    expect(state.stakePool.toBase58()).to.eq(stakePool.toBase58());
    expect(state.poolMint.toBase58()).to.eq(poolMint.toBase58());
  });

  it.skip("deposits SOL and receives pool tokens in vault ATA", async () => {
    // 1) Build stake-pool deposit_sol ix data for your chosen stake pool.
    // 2) Supply all required remainingAccounts in exact order expected by stake-pool program.
    // 3) Call depositSol(amount, ixData).
    // 4) Assert vault pool token ATA balance increased.
  });

  it.skip("simulates yield (local stake pool exchange-rate increase or controlled token injection)", async () => {
    // For localnet, use a controllable stake pool to increase exchange rate.
    // Alternative for deterministic tests: mint extra pool tokens into vault ATA in test harness.
  });

  it.skip("awards points and finalizes with value snapshot", async () => {
    // awardPoints for multiple users
    // finalize after seasonEnd
    // assert final_total_assets_lamports, final_total_yield_lamports
  });

  it.skip("withdraws pro-rata in pool tokens", async () => {
    // withdraw for each user
    // assert user ATA received expected pool tokens based on points share
  });

  it.skip("totalPoints == 0 distributes no yield (carryover retained)", async () => {
    // no points awarded
    // finalize with positive yield
    // user withdraw gets principal-only value in pool tokens
    // carry_over_yield_lamports > 0
  });
});
