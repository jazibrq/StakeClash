/**
 * HBARSeasonVault Contract ABI Reference
 * 
 * Key interface for integrating with frontend, wallets, and APIs.
 * Use this to generate ethers.js Contract instances or call contracts directly.
 * 
 * Contract Address (Hedera EVM): 0x000000000a0002 (example)
 * Network: Hedera Testnet / Mainnet
 */

export const HBAR_SEASON_VAULT_ABI = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // State-Changing Functions
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    type: 'function',
    name: 'deposit',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
    description:
      'User deposits HBAR into the vault. Must occur before depositEnd. Emits Deposited event.',
  },

  {
    type: 'function',
    name: 'addPoints',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    description:
      'Only GAME_ENGINE can call this. Awards points to a user during active season. Emits PointsAdded event.',
  },

  {
    type: 'function',
    name: 'finalize',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
    description:
      'Called after seasonEnd to snapshot total yield. Must be called before redemption. Emits Finalized event.',
  },

  {
    type: 'function',
    name: 'redeem',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
    description:
      'User redeems principal + pro-rata yield. Only after finalize(). Emits Redeemed event and transfers HBAR to user.',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // View Functions (Read-only, no gas)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    type: 'function',
    name: 'GAME_ENGINE',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    description: 'Address of the game engine contract.',
  },

  {
    type: 'function',
    name: 'depositEnd',
    inputs: [],
    outputs: [{ type: 'uint64' }],
    stateMutability: 'view',
    description: 'Unix timestamp when deposits close.',
  },

  {
    type: 'function',
    name: 'seasonStart',
    inputs: [],
    outputs: [{ type: 'uint64' }],
    stateMutability: 'view',
    description: 'Unix timestamp when season begins.',
  },

  {
    type: 'function',
    name: 'seasonEnd',
    inputs: [],
    outputs: [{ type: 'uint64' }],
    stateMutability: 'view',
    description: 'Unix timestamp when season ends.',
  },

  {
    type: 'function',
    name: 'principal',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    description: 'Amount deposited by a user (in wei-equivalent for HBAR).',
  },

  {
    type: 'function',
    name: 'totalPrincipal',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    description: 'Total HBAR deposited by all users.',
  },

  {
    type: 'function',
    name: 'points',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    description: 'Points earned by a user during the season.',
  },

  {
    type: 'function',
    name: 'totalPoints',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    description: 'Total points awarded to all users.',
  },

  {
    type: 'function',
    name: 'finalized',
    inputs: [],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    description: 'Whether finalize() has been called.',
  },

  {
    type: 'function',
    name: 'totalYieldSnapshot',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    description: 'Total yield captured at finalization.',
  },

  {
    type: 'function',
    name: 'redeemed',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    description: 'Whether a user has already redeemed.',
  },

  {
    type: 'function',
    name: 'previewRedeem',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'principal', type: 'uint256' },
      { name: 'yield', type: 'uint256' },
      { name: 'total', type: 'uint256' },
    ],
    stateMutability: 'view',
    description:
      'Preview what a user would receive if they redeemed now. Returns (principal, yield, total).',
  },

  {
    type: 'function',
    name: 'canRedeem',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    description:
      'Check if a user is eligible to redeem (finalized, not redeemed, has balance).',
  },

  {
    type: 'function',
    name: 'getContractBalance',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    description:
      'Current contract balance (includes principal + staking rewards).',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Events
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newUserPrincipal', type: 'uint256', indexed: false },
      { name: 'newTotalPrincipal', type: 'uint256', indexed: false },
    ],
    description: 'Emitted when a user deposits HBAR.',
  },

  {
    type: 'event',
    name: 'PointsAdded',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newUserPoints', type: 'uint256', indexed: false },
      { name: 'newTotalPoints', type: 'uint256', indexed: false },
    ],
    description: 'Emitted when game engine awards points to a user.',
  },

  {
    type: 'event',
    name: 'Finalized',
    inputs: [
      { name: 'totalAssets', type: 'uint256', indexed: false },
      { name: 'totalPrincipalAtEnd', type: 'uint256', indexed: false },
      { name: 'totalYieldEarned', type: 'uint256', indexed: false },
    ],
    description: 'Emitted when finalize() is called. Snapshots yield.',
  },

  {
    type: 'event',
    name: 'Redeemed',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'principalPaid', type: 'uint256', indexed: false },
      { name: 'yieldPaid', type: 'uint256', indexed: false },
      { name: 'totalPaid', type: 'uint256', indexed: false },
    ],
    description: 'Emitted when a user calls redeem() and receives their payout.',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Errors
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    type: 'error',
    name: 'NotGameEngine',
    description: 'Only GAME_ENGINE address can call this function.',
  },

  {
    type: 'error',
    name: 'DepositClosed',
    description: 'Deposits are no longer accepted (depositEnd passed).',
  },

  {
    type: 'error',
    name: 'SeasonNotStarted',
    description: 'Season has not begun yet (before seasonStart).',
  },

  {
    type: 'error',
    name: 'SeasonNotEnded',
    description: 'Season is still active (before seasonEnd).',
  },

  {
    type: 'error',
    name: 'AlreadyFinalized',
    description: 'finalize() has already been called.',
  },

  {
    type: 'error',
    name: 'NotFinalized',
    description: 'finalize() has not been called yet.',
  },

  {
    type: 'error',
    name: 'AlreadyRedeemed',
    description: 'User has already redeemed.',
  },

  {
    type: 'error',
    name: 'ZeroDeposit',
    description: 'Deposit amount must be > 0.',
  },

  {
    type: 'error',
    name: 'InsufficientContractBalance',
    description: 'Contract has insufficient balance for payout.',
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Usage Examples
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Using ethers.js to interact with contract
 */
export const INTEGRATION_EXAMPLES = {
  ethers: `
    import { ethers } from 'ethers';
    import { HBAR_SEASON_VAULT_ABI } from './abi.js';

    const contractAddress = '0x000000000a0002';
    const contract = new ethers.Contract(
      contractAddress,
      HBAR_SEASON_VAULT_ABI,
      signer  // ethers.Signer instance
    );

    // Deposit 10 HBAR
    const tx = await contract.deposit({ value: ethers.parseEther('10') });
    await tx.wait();

    // Check principal
    const myPrincipal = await contract.principal(userAddress);
    console.log('My principal:', ethers.formatEther(myPrincipal), 'HBAR');

    // Preview payout
    const [principal, yield, total] = await contract.previewRedeem(userAddress);
    console.log('Expected payout:', ethers.formatEther(total), 'HBAR');

    // Redeem after finalization
    const redeemTx = await contract.redeem();
    await redeemTx.wait();
  `,

  hedera_sdk: `
    import {
      Client,
      ContractId,
      ContractExecuteTransaction,
      Hbar,
    } from '@hashgraph/sdk';

    const contractId = ContractId.fromString('0.0.654321');
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    // Deposit 10 HBAR
    const depositTx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setFunction('deposit')
      .setGas(100_000)
      .setPayableAmount(new Hbar(10));

    const record = await depositTx.execute(client).getRecord(client);
    console.log('Deposit successful:', record.transactionId);

    // Check balance
    const balanceQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setFunction('getContractBalance')
      .setGas(100_000);

    const result = balanceQuery.execute(client);
    console.log('Contract balance:', result);
  `,

  react_dapp: `
    import { useEffect, useState } from 'react';
    import { ethers } from 'ethers';
    import { HBAR_SEASON_VAULT_ABI } from './abi.js';

    export function DepositComponent() {
      const [amount, setAmount] = useState('');
      const [contract, setContract] = useState(null);

      useEffect(() => {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = provider.getSigner();
        const vault = new ethers.Contract(
          '0x000000000a0002',
          HBAR_SEASON_VAULT_ABI,
          signer
        );
        setContract(vault);
      }, []);

      async function handleDeposit() {
        if (!contract) return;
        try {
          const tx = await contract.deposit({
            value: ethers.parseEther(amount),
          });
          await tx.wait();
          alert('Deposit successful!');
          setAmount('');
        } catch (error) {
          alert('Deposit failed: ' + error.message);
        }
      }

      return (
        <div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount in HBAR"
          />
          <button onClick={handleDeposit}>Deposit</button>
        </div>
      );
    }
  `,
};

export default HBAR_SEASON_VAULT_ABI;
