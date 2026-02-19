# Season SOL Vault (Anchor, SPL Stake Pool)

Single-season SOL vault that earns real yield via liquid staking into an SPL Stake Pool (JitoSOL-style flow).

## What this implements
- Deposit window: `[deposit_start, deposit_end)`
- Season end timestamp: `season_end`
- Users deposit SOL (lamports)
- Program CPIs into configured stake-pool `deposit_sol` path and receives pool tokens in vault ATA (PDA-owned)
- Tracks per-user principal and points
- Finalization snapshots total assets in SOL-value terms and computes yield
- Withdraw pays users in pool tokens (solvency-safe)
- If `total_points == 0`, yield is retained as carryover
- Two-step game engine update (`propose_game_engine` -> `accept_game_engine`), frozen once deposits open

## Program accounts
- `SeasonState` PDA: `['season_state']`
- `UserPosition` PDA: `['user_position', season_state, user]`
- Vault authority PDA: `['vault_authority', season_state]`
- Vault pool token ATA: ATA(pool_mint, vault_authority)

## Devnet / mainnet note (important)
Use the correct stake-pool program deployment for your cluster.
- Mainnet canonical SPL stake-pool program is commonly: `SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy`
- For devnet testing, use the deployment that mirrors current mainnet behavior; avoid outdated devnet references.

## Deposit CPI wiring
`deposit_sol` instruction in this program accepts:
- `amount_lamports`
- `stake_pool_deposit_ix_data: Vec<u8>`

The client must pass exact stake-pool `deposit_sol` instruction bytes and all required accounts via `remaining_accounts` in exact expected order.

This design keeps on-chain logic flexible across stake-pool versions while still performing real CPI.

## End-to-end checklist
1. Start local validator or choose devnet.
2. Airdrop SOL to owner/game_engine/users.
3. Create or choose a devnet stake pool + pool mint.
4. Run `initialize` script with stake pool config.
5. Build stake-pool `deposit_sol` ix bytes off-chain and call `deposit` script.
6. Verify vault pool ATA balance increases.
7. Award points during season.
8. Simulate yield:
   - preferred: use a controllable local stake pool and adjust exchange rate,
   - alternative test harness: inject extra pool tokens into vault ATA.
9. After `season_end`, call `finalize`.
10. Call `withdraw` for each user and verify pool-token payouts are pro-rata by points.
11. Verify `total_points == 0` case keeps yield as `carry_over_yield_lamports`.

## Scripts
- `scripts/initialize.ts`
- `scripts/deposit.ts`
- `scripts/award-points.ts`
- `scripts/finalize.ts`
- `scripts/withdraw.ts`

## Funding
- Localnet: `solana airdrop 10`
- Devnet faucet: `solana airdrop 2 --url devnet`
