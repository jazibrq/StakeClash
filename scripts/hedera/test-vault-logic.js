/**
 * HBARSeasonVault Contract Logic Test
 * 
 * This file tests the core logic of the HBARSeasonVault contract.
 * Since this is a Node.js test, we simulate the contract state machine
 * to verify correct behavior before deployment.
 * 
 * Run: node scripts/hedera/test-vault-logic.js
 */

import assert from 'node:assert/strict';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mock HBARSeasonVault State
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class MockHBARSeasonVault {
  constructor(gameEngine, depositEnd, seasonStart, seasonEnd) {
    this.GAME_ENGINE = gameEngine;
    this.depositEnd = depositEnd;
    this.seasonStart = seasonStart;
    this.seasonEnd = seasonEnd;

    // State
    this.users = {}; // { address => { principal, points, redeemed } }
    this.totalPrincipal = 0n;
    this.totalPoints = 0n;
    this.contractBalance = 0n;
    this.finalized = false;
    this.totalYieldSnapshot = 0n;

    // Events
    this.events = [];
    this.currentTime = 0n;
  }

  // Set current block.timestamp for testing
  setTime(timestamp) {
    this.currentTime = BigInt(timestamp);
  }

  // Simulate contract balance change (e.g., staking rewards)
  addStakingRewards(amount) {
    this.contractBalance += BigInt(amount);
  }

  deposit(user, amount) {
    const now = this.currentTime;
    const amount_bn = BigInt(amount);

    if (now > this.depositEnd) throw new Error('DepositClosed');
    if (amount_bn === 0n) throw new Error('ZeroDeposit');

    if (!this.users[user]) {
      this.users[user] = { principal: 0n, points: 0n, redeemed: false };
    }

    this.users[user].principal += amount_bn;
    this.totalPrincipal += amount_bn;
    this.contractBalance += amount_bn;

    this.events.push({
      type: 'Deposited',
      user,
      amount: amount_bn.toString(),
      timestamp: Number(now),
    });
  }

  addPoints(user, amount) {
    const now = this.currentTime;
    const amount_bn = BigInt(amount);

    if (now < this.seasonStart) throw new Error('SeasonNotStarted');
    if (now >= this.seasonEnd) throw new Error('SeasonNotEnded');

    if (!user || amount_bn === 0n) return;

    if (!this.users[user]) {
      this.users[user] = { principal: 0n, points: 0n, redeemed: false };
    }

    this.users[user].points += amount_bn;
    this.totalPoints += amount_bn;

    this.events.push({
      type: 'PointsAdded',
      user,
      amount: amount_bn.toString(),
      timestamp: Number(now),
    });
  }

  finalize() {
    if (this.currentTime < this.seasonEnd) throw new Error('SeasonNotEnded');
    if (this.finalized) throw new Error('AlreadyFinalized');

    const totalAssets = this.contractBalance;
    const yieldEarned = totalAssets > this.totalPrincipal ? totalAssets - this.totalPrincipal : 0n;

    this.totalYieldSnapshot = yieldEarned;
    this.finalized = true;

    this.events.push({
      type: 'Finalized',
      totalAssets: totalAssets.toString(),
      totalPrincipal: this.totalPrincipal.toString(),
      yieldEarned: yieldEarned.toString(),
      timestamp: Number(this.currentTime),
    });
  }

  redeem(user) {
    if (!this.finalized) throw new Error('NotFinalized');
    if (!this.users[user]) throw new Error('NoUser');
    if (this.users[user].redeemed) throw new Error('AlreadyRedeemed');

    const userPrincipal = this.users[user].principal;
    const userPoints = this.users[user].points;

    if (userPrincipal === 0n) {
      this.users[user].redeemed = true;
      this.events.push({
        type: 'Redeemed',
        user,
        principalPaid: '0',
        yieldPaid: '0',
        totalPaid: '0',
        timestamp: Number(this.currentTime),
      });
      return { principal: 0n, yield: 0n, total: 0n };
    }

    let userYield = 0n;
    if (this.totalPoints > 0n) {
      userYield = (this.totalYieldSnapshot * userPoints) / this.totalPoints;
    }

    const payout = userPrincipal + userYield;

    if (this.contractBalance < payout) throw new Error('InsufficientContractBalance');

    this.users[user].redeemed = true;
    this.users[user].principal = 0n;
    this.contractBalance -= payout;

    this.events.push({
      type: 'Redeemed',
      user,
      principalPaid: userPrincipal.toString(),
      yieldPaid: userYield.toString(),
      totalPaid: payout.toString(),
      timestamp: Number(this.currentTime),
    });

    return { principal: userPrincipal, yield: userYield, total: payout };
  }

  previewRedeem(user) {
    if (!this.users[user]) return { principal: 0n, yield: 0n, total: 0n };

    const userPrincipal = this.users[user].principal;
    const userPoints = this.users[user].points;

    let userYield = 0n;
    if (this.finalized && this.totalPoints > 0n) {
      userYield = (this.totalYieldSnapshot * userPoints) / this.totalPoints;
    }

    return {
      principal: userPrincipal,
      yield: userYield,
      total: userPrincipal + userYield,
    };
  }

  printEvents() {
    console.log('\n📋 Event Log:');
    this.events.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.type} @ ${e.timestamp}`);
      console.log(`     ${JSON.stringify(e, null, 2).split('\n').slice(1, -1).join('\n     ')}`);
    });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${e.message}`);
    process.exit(1);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Run Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runTests() {
  console.log('🧪 HBARSeasonVault Logic Tests\n');

  // Setup
  const now = 1000;
  const depositEnd = 10000;
  const seasonStart = 10000;
  const seasonEnd = 100000;
  const gameEngine = '0x1234567890123456789012345678901234567890';

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Test 1: Deposit Phase
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('📝 Test Group 1: Deposit Phase');

  test('Deposit before window closes', () => {
    const vault = new MockHBARSeasonVault(gameEngine, depositEnd, seasonStart, seasonEnd);
    vault.setTime(now);

    vault.deposit('user1', 1000);
    vault.deposit('user2', 2000);

    assert.equal(vault.totalPrincipal, 3000n);
    assert.equal(vault.users['user1'].principal, 1000n);
    assert.equal(vault.users['user2'].principal, 2000n);
    assert.equal(vault.contractBalance, 3000n);
  });

  test('Reject zero deposit', () => {
    const vault = new MockHBARSeasonVault(gameEngine, depositEnd, seasonStart, seasonEnd);
    vault.setTime(now);

    try {
      vault.deposit('user1', 0);
      throw new Error('Should have rejected zero deposit');
    } catch (e) {
      assert.equal(e.message, 'ZeroDeposit');
    }
  });

  test('Reject deposit after window closes', () => {
    const vault = new MockHBARSeasonVault(gameEngine, depositEnd, seasonStart, seasonEnd);
    vault.setTime(depositEnd + 1);

    try {
      vault.deposit('user1', 1000);
      throw new Error('Should have rejected late deposit');
    } catch (e) {
      assert.equal(e.message, 'DepositClosed');
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Test 2: Points Phase
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🎯 Test Group 2: Points/Season Phase');

  test('Add points during season', () => {
    const vault = new MockHBARSeasonVault(gameEngine, depositEnd, seasonStart, seasonEnd);
    vault.setTime(seasonStart + 100);

    vault.addPoints('user1', 100);
    vault.addPoints('user1', 50);
    vault.addPoints('user2', 200);

    assert.equal(vault.totalPoints, 350n);
    assert.equal(vault.users['user1'].points, 150n);
    assert.equal(vault.users['user2'].points, 200n);
  });

  test('Reject points before season starts', () => {
    const vault = new MockHBARSeasonVault(gameEngine, depositEnd, seasonStart, seasonEnd);
    vault.setTime(seasonStart - 1);

    try {
      vault.addPoints('user1', 100);
      throw new Error('Should have rejected early points');
    } catch (e) {
      assert.equal(e.message, 'SeasonNotStarted');
    }
  });

  test('Reject points after season ends', () => {
    const vault = new MockHBARSeasonVault(gameEngine, depositEnd, seasonStart, seasonEnd);
    vault.setTime(seasonEnd);

    try {
      vault.addPoints('user1', 100);
      throw new Error('Should have rejected late points');
    } catch (e) {
      assert.equal(e.message, 'SeasonNotEnded');
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Test 3: Finalization
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🔒 Test Group 3: Finalization');

  test('Finalize after season ends', () => {
    const vault = new MockHBARSeasonVault(gameEngine, depositEnd, seasonStart, seasonEnd);
    vault.setTime(now);
    vault.deposit('user1', 1000);

    vault.setTime(seasonEnd);
    // Simulate staking rewards
    vault.addStakingRewards(100);

    vault.finalize();

    assert.equal(vault.finalized, true);
    assert.equal(vault.totalYieldSnapshot, 100n);
    assert.equal(vault.contractBalance, 1100n);
  });

  test('Reject finalize before season ends', () => {
    const vault = new MockHBARSeasonVault(gameEngine, depositEnd, seasonStart, seasonEnd);
    vault.setTime(seasonEnd - 1);

    try {
      vault.finalize();
      throw new Error('Should have rejected early finalize');
    } catch (e) {
      assert.equal(e.message, 'SeasonNotEnded');
    }
  });

  test('Reject double finalize', () => {
    const vault = new MockHBARSeasonVault(gameEngine, depositEnd, seasonStart, seasonEnd);
    vault.setTime(now);
    vault.deposit('user1', 1000);

    vault.setTime(seasonEnd);
    vault.finalize();

    try {
      vault.finalize();
      throw new Error('Should have rejected double finalize');
    } catch (e) {
      assert.equal(e.message, 'AlreadyFinalized');
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Test 4: Redemption with Yield Distribution
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n💰 Test Group 4: Redemption & Yield Distribution');

  test('Redeem with pro-rata yield', () => {
    const vault = new MockHBARSeasonVault(gameEngine, depositEnd, seasonStart, seasonEnd);
    vault.setTime(now);

    // Deposits
    vault.deposit('user1', 1000);
    vault.deposit('user2', 1000);

    // Add points (different ratios)
    vault.setTime(seasonStart + 100);
    vault.addPoints('user1', 100);
    vault.addPoints('user2', 200);

    // Season ends with rewards
    vault.setTime(seasonEnd);
    vault.addStakingRewards(300); // 300 yield

    vault.finalize();

    // User1 has 100/300 = 1/3 of yield
    // User1 payout = 1000 (principal) + 100 (yield) = 1100
    const result1 = vault.redeem('user1');
    assert.equal(result1.principal, 1000n);
    assert.equal(result1.yield, 100n);
    assert.equal(result1.total, 1100n);

    // User2 has 200/300 = 2/3 of yield
    // User2 payout = 1000 (principal) + 200 (yield) = 1200
    const result2 = vault.redeem('user2');
    assert.equal(result2.principal, 1000n);
    assert.equal(result2.yield, 200n);
    assert.equal(result2.total, 1200n);
  });

  test('No yield distributed if totalPoints == 0', () => {
    const vault = new MockHBARSeasonVault(gameEngine, depositEnd, seasonStart, seasonEnd);
    vault.setTime(now);

    vault.deposit('user1', 1000);

    // No points awarded
    vault.setTime(seasonEnd);
    vault.addStakingRewards(300);

    vault.finalize();

    // User gets only principal, no yield
    const result = vault.redeem('user1');
    assert.equal(result.principal, 1000n);
    assert.equal(result.yield, 0n);
    assert.equal(result.total, 1000n);

    // Yield remains in contract
    assert.equal(vault.contractBalance, 300n);
  });

  test('Redeem with no deposit', () => {
    const vault = new MockHBARSeasonVault(gameEngine, depositEnd, seasonStart, seasonEnd);
    vault.setTime(seasonEnd);
    vault.finalize();

    // User with no deposit
    try {
      vault.redeem('user_never_deposited');
      throw new Error('Should have thrown NoUser');
    } catch (e) {
      assert.equal(e.message, 'NoUser');
    }
  });

  test('Reject redeem before finalization', () => {
    const vault = new MockHBARSeasonVault(gameEngine, depositEnd, seasonStart, seasonEnd);
    vault.setTime(now);
    vault.deposit('user1', 1000);

    vault.setTime(seasonEnd - 1);

    try {
      vault.redeem('user1');
      throw new Error('Should have rejected early redeem');
    } catch (e) {
      assert.equal(e.message, 'NotFinalized');
    }
  });

  test('Reject double redeem', () => {
    const vault = new MockHBARSeasonVault(gameEngine, depositEnd, seasonStart, seasonEnd);
    vault.setTime(now);
    vault.deposit('user1', 1000);

    vault.setTime(seasonEnd);
    vault.finalize();
    vault.redeem('user1');

    try {
      vault.redeem('user1');
      throw new Error('Should have rejected double redeem');
    } catch (e) {
      assert.equal(e.message, 'AlreadyRedeemed');
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Test 5: Complex Scenario
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n🎪 Test Group 5: Complex Scenario');

  test('Full season cycle with multiple users', () => {
    const vault = new MockHBARSeasonVault(gameEngine, depositEnd, seasonStart, seasonEnd);

    // Phase 1: Deposits
    vault.setTime(5000);
    vault.deposit('alice', 5000n);
    vault.deposit('bob', 3000n);
    vault.deposit('charlie', 2000n);

    assert.equal(vault.totalPrincipal, 10000n);

    // Phase 2: Points
    vault.setTime(50000);
    vault.addPoints('alice', 100);
    vault.addPoints('bob', 200);
    vault.addPoints('charlie', 50);
    vault.addPoints('alice', 50); // Alice gets 150 total

    assert.equal(vault.totalPoints, 400n);

    // Phase 3: Rewards
    vault.setTime(seasonEnd);
    vault.addStakingRewards(800); // 8% yield on 10k

    // Phase 4: Finalize
    vault.finalize();
    assert.equal(vault.totalYieldSnapshot, 800n);

    // Phase 5: Redeem
    const aliceResult = vault.redeem('alice');
    assert.equal(aliceResult.principal, 5000n);
    assert.equal(aliceResult.yield, 300n); // 150/400 * 800
    assert.equal(aliceResult.total, 5300n);

    const bobResult = vault.redeem('bob');
    assert.equal(bobResult.principal, 3000n);
    assert.equal(bobResult.yield, 400n); // 200/400 * 800
    assert.equal(bobResult.total, 3400n);

    const charlieResult = vault.redeem('charlie');
    assert.equal(charlieResult.principal, 2000n);
    assert.equal(charlieResult.yield, 100n); // 50/400 * 800
    assert.equal(charlieResult.total, 2100n);

    // All funds distributed
    assert.equal(vault.contractBalance, 0n);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Summary
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ All tests passed!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run all tests
runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
