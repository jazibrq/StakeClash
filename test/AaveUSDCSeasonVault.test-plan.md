# AaveUSDCSeasonVault Hardhat Test Plan (Sepolia)

## Scope
Validate season-based USDC lending vault behavior on Aave V3 Sepolia:
- Deposits transfer USDC from users and supply to Aave
- Vault receives/holds aUSDC and accrues yield in value terms
- Points-based pro-rata yield distribution works
- `totalPoints == 0` keeps yield as carry-over

## Important Sepolia Token Note
There are multiple USDC tokens on Sepolia.
Use the USDC that is **actually listed in Aave Sepolia market**.
The contract enforces this at construction by requiring non-zero aToken from:
`protocolDataProvider.getReserveTokensAddresses(usdc)`.

Common addresses you may encounter:
- Aave market USDC (often): `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- Circle Sepolia USDC (commonly different): `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8`

## Hardhat Setup (suggested)
- Network: Sepolia
- Fork URL optional for deterministic tests
- Accounts: owner, gameEngine, user1, user2, user3

## Test Cases

### 1) Constructor and reserve validation
- Deploy with valid addresses provider + protocol data provider + Aave-listed USDC
- Assert:
  - `pool()` equals `addressesProvider.getPool()`
  - `aUsdc()` is non-zero
- Negative test:
  - Pass a non-listed token and expect `InvalidReserve`

### 2) Deposit window gating
- Before `depositStart`: `deposit(amount)` reverts `DepositsClosed`
- During `[depositStart, depositEnd)`: deposit succeeds
- At/after `depositEnd`: deposit reverts `DepositsClosed`

### 3) Deposit supplies to Aave
- User approves vault for USDC amount
- Call `deposit(amount)`
- Assert:
  - `principal[user] == amount`
  - `totalPrincipal` increments
  - `SuppliedToAave` emitted
  - vault `aUsdc.balanceOf(vault)` increased (or at least non-decreasing after supply)

### 4) Points accounting and access control
- Non-gameEngine calling `awardPoints` reverts `NotGameEngine`
- `gameEngine` awards points to users
- Assert `points[user]` and `totalPoints` update correctly

### 5) Finalization snapshots value-based yield
- Move time past `seasonEnd`
- Call `endSeason()`
- Assert:
  - `seasonFinalized == true`
  - `finalTotalAssets == aUsdc.balanceOf(vault)` at finalize block
  - `finalTotalYield == max(finalTotalAssets - totalPrincipal, 0)`

### 6) Withdraw principal + pro-rata yield
- Setup:
  - user1 principal=100e6, points=100
  - user2 principal=200e6, points=300
  - totalPoints=400
- After finalization, compute expected:
  - user1 yield = `finalTotalYield * 100 / 400`
  - user2 yield = `finalTotalYield * 300 / 400`
- Withdraw each user
- Assert:
  - each gets principal + expected yield share in USDC (via `pool.withdraw` path)
  - second withdraw call reverts `AlreadyWithdrawn`

### 7) `totalPoints == 0` behavior
- Users deposit, no points awarded
- Finalize season with positive yield
- Assert:
  - `carryOverYield == finalTotalYield`
- User withdraws:
  - receives principal only
  - no yield distributed

### 8) Rescue restrictions
- Owner cannot rescue `usdc` or `aUsdc` (`RescueForbiddenToken`)
- Owner can rescue unrelated ERC20 token accidentally sent to vault

---

## End-to-End Sepolia Checklist
1. Open app.aave.com in testnet mode and switch to Sepolia.
2. Use Aave Faucet tab to mint test tokens (including Aave-listed USDC where available).
3. Confirm the USDC reserve address used by Aave market.
4. Deploy `AaveUSDCSeasonVault` with that USDC, Sepolia addresses provider, and protocol data provider.
5. From user wallet(s), approve vault for USDC.
6. Deposit during deposit window.
7. Verify vault aUSDC balance grows over time.
8. Award points using `gameEngine` account.
9. After `seasonEnd`, call `endSeason()`.
10. Call `previewWithdraw(user)` and compare with expected pro-rata math.
11. Withdraw for each user and verify USDC received.
12. Verify `totalPoints == 0` season keeps yield as `carryOverYield`.
