use anchor_lang::prelude::*;
use anchor_lang::prelude::borsh::BorshDeserialize;
use anchor_lang::solana_program::{instruction::AccountMeta, instruction::Instruction, program::invoke};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use spl_stake_pool::state::StakePool;

declare_id!("Fg6PaFpoGXkYsidMpWxTWqkZ7FEfcYkgP6R1q4x5u8kQ");

#[program]
pub mod season_vault {
    use super::*;

    pub fn initialize_season(
        ctx: Context<InitializeSeason>,
        deposit_start: i64,
        deposit_end: i64,
        season_end: i64,
        game_engine: Pubkey,
    ) -> Result<()> {
        require!(deposit_start < deposit_end && deposit_end < season_end, ErrorCode::InvalidTimeWindow);
        require!(game_engine != Pubkey::default(), ErrorCode::InvalidAuthority);

        let season_state = &mut ctx.accounts.season_state;
        season_state.owner = ctx.accounts.owner.key();
        season_state.game_engine = game_engine;
        season_state.pending_game_engine = Pubkey::default();

        season_state.deposit_start = deposit_start;
        season_state.deposit_end = deposit_end;
        season_state.season_end = season_end;

        season_state.total_principal_lamports = 0;
        season_state.total_points = 0;

        season_state.finalized = false;
        season_state.final_total_assets_lamports = 0;
        season_state.final_total_yield_lamports = 0;
        season_state.final_vault_pool_tokens = 0;
        season_state.carry_over_yield_lamports = 0;

        season_state.stake_pool_program_id = ctx.accounts.stake_pool_program.key();
        season_state.stake_pool = ctx.accounts.stake_pool.key();
        season_state.pool_mint = ctx.accounts.pool_mint.key();
        season_state.vault_pool_token_ata = ctx.accounts.vault_pool_token_ata.key();

        season_state.bump = ctx.bumps.season_state;
        season_state.vault_authority_bump = ctx.bumps.vault_authority;

        emit!(SeasonInitialized {
            owner: season_state.owner,
            game_engine,
            deposit_start,
            deposit_end,
            season_end,
            stake_pool_program_id: season_state.stake_pool_program_id,
            stake_pool: season_state.stake_pool,
            pool_mint: season_state.pool_mint,
            vault_pool_token_ata: season_state.vault_pool_token_ata,
        });

        Ok(())
    }

    pub fn propose_game_engine(ctx: Context<ProposeGameEngine>, new_game_engine: Pubkey) -> Result<()> {
        let season_state = &mut ctx.accounts.season_state;

        require!(new_game_engine != Pubkey::default(), ErrorCode::InvalidAuthority);
        require!(Clock::get()?.unix_timestamp < season_state.deposit_start, ErrorCode::GameEngineFrozen);

        season_state.pending_game_engine = new_game_engine;

        emit!(GameEngineProposed {
            current_game_engine: season_state.game_engine,
            proposed_game_engine: new_game_engine,
        });

        Ok(())
    }

    pub fn accept_game_engine(ctx: Context<AcceptGameEngine>) -> Result<()> {
        let season_state = &mut ctx.accounts.season_state;

        require!(season_state.pending_game_engine != Pubkey::default(), ErrorCode::NoPendingGameEngine);
        require_keys_eq!(ctx.accounts.proposed_game_engine.key(), season_state.pending_game_engine, ErrorCode::UnauthorizedGameEngineAccept);

        let previous = season_state.game_engine;
        season_state.game_engine = season_state.pending_game_engine;
        season_state.pending_game_engine = Pubkey::default();

        emit!(GameEngineAccepted {
            previous_game_engine: previous,
            new_game_engine: season_state.game_engine,
        });

        Ok(())
    }

    /// Deposit SOL by CPI into SPL stake-pool `deposit_sol` flow.
    ///
    /// Client must pass the exact stake-pool `deposit_sol` instruction data bytes
    /// plus all required account metas as `remaining_accounts` in the same order.
    pub fn deposit_sol(
        ctx: Context<DepositSol>,
        amount_lamports: u64,
        stake_pool_deposit_ix_data: Vec<u8>,
    ) -> Result<()> {
        let season_state = &mut ctx.accounts.season_state;
        let now = Clock::get()?.unix_timestamp;

        require!(!season_state.finalized, ErrorCode::SeasonAlreadyFinalized);
        require!(now >= season_state.deposit_start && now < season_state.deposit_end, ErrorCode::DepositWindowClosed);
        require!(amount_lamports > 0, ErrorCode::InvalidAmount);

        require_keys_eq!(ctx.accounts.stake_pool_program.key(), season_state.stake_pool_program_id, ErrorCode::InvalidStakePoolProgram);
        require_keys_eq!(ctx.accounts.stake_pool.key(), season_state.stake_pool, ErrorCode::InvalidStakePoolAccount);
        require_keys_eq!(ctx.accounts.vault_pool_token_ata.key(), season_state.vault_pool_token_ata, ErrorCode::InvalidVaultPoolTokenAccount);

        let before_tokens = ctx.accounts.vault_pool_token_ata.amount;

        let metas: Vec<AccountMeta> = ctx
            .remaining_accounts
            .iter()
            .map(|acc| AccountMeta {
                pubkey: *acc.key,
                is_signer: acc.is_signer,
                is_writable: acc.is_writable,
            })
            .collect();

        let ix = Instruction {
            program_id: ctx.accounts.stake_pool_program.key(),
            accounts: metas,
            data: stake_pool_deposit_ix_data,
        };

        invoke(&ix, ctx.remaining_accounts)?;

        ctx.accounts.vault_pool_token_ata.reload()?;
        let after_tokens = ctx.accounts.vault_pool_token_ata.amount;
        require!(after_tokens >= before_tokens, ErrorCode::StakePoolCpiNoMint);

        let user_position = &mut ctx.accounts.user_position;
        if user_position.user == Pubkey::default() {
            user_position.season = season_state.key();
            user_position.user = ctx.accounts.user.key();
            user_position.principal_lamports = 0;
            user_position.points = 0;
            user_position.withdrawn = false;
            user_position.bump = ctx.bumps.user_position;
        }

        user_position.principal_lamports = user_position
            .principal_lamports
            .checked_add(amount_lamports)
            .ok_or(ErrorCode::MathOverflow)?;

        season_state.total_principal_lamports = season_state
            .total_principal_lamports
            .checked_add(amount_lamports)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(Deposited {
            user: ctx.accounts.user.key(),
            amount_lamports,
            new_user_principal_lamports: user_position.principal_lamports,
            new_total_principal_lamports: season_state.total_principal_lamports,
            minted_pool_token_delta: after_tokens.saturating_sub(before_tokens),
        });

        Ok(())
    }

    pub fn award_points(ctx: Context<AwardPoints>, delta: u64) -> Result<()> {
        let season_state = &mut ctx.accounts.season_state;
        let now = Clock::get()?.unix_timestamp;

        require!(!season_state.finalized, ErrorCode::SeasonAlreadyFinalized);
        require!(now >= season_state.deposit_start && now < season_state.season_end, ErrorCode::PointsWindowClosed);

        if delta == 0 {
            return Ok(());
        }

        let user_position = &mut ctx.accounts.user_position;
        user_position.points = user_position.points.checked_add(delta).ok_or(ErrorCode::MathOverflow)?;
        season_state.total_points = season_state.total_points.checked_add(delta).ok_or(ErrorCode::MathOverflow)?;

        emit!(PointsAwarded {
            user: user_position.user,
            delta,
            new_user_points: user_position.points,
            new_total_points: season_state.total_points,
        });

        Ok(())
    }

    pub fn finalize(ctx: Context<Finalize>) -> Result<()> {
        let season_state = &mut ctx.accounts.season_state;
        let now = Clock::get()?.unix_timestamp;

        require!(now >= season_state.season_end, ErrorCode::SeasonNotEnded);
        require!(!season_state.finalized, ErrorCode::SeasonAlreadyFinalized);

        require_keys_eq!(ctx.accounts.stake_pool.key(), season_state.stake_pool, ErrorCode::InvalidStakePoolAccount);
        require_keys_eq!(ctx.accounts.vault_pool_token_ata.key(), season_state.vault_pool_token_ata, ErrorCode::InvalidVaultPoolTokenAccount);

        let stake_pool_state = read_stake_pool_state(&ctx.accounts.stake_pool)?;

        let vault_pool_tokens = ctx.accounts.vault_pool_token_ata.amount;
        let total_assets_lamports = pool_tokens_to_lamports_floor(vault_pool_tokens, &stake_pool_state)?;

        season_state.final_total_assets_lamports = total_assets_lamports;
        season_state.final_vault_pool_tokens = vault_pool_tokens;

        let total_principal = season_state.total_principal_lamports;
        let total_yield = total_assets_lamports.saturating_sub(total_principal);

        season_state.final_total_yield_lamports = total_yield;

        if season_state.total_points == 0 && total_yield > 0 {
            season_state.carry_over_yield_lamports = season_state
                .carry_over_yield_lamports
                .checked_add(total_yield)
                .ok_or(ErrorCode::MathOverflow)?;
        }

        season_state.finalized = true;

        emit!(SeasonFinalized {
            final_total_assets_lamports: season_state.final_total_assets_lamports,
            total_principal_lamports: season_state.total_principal_lamports,
            final_total_yield_lamports: season_state.final_total_yield_lamports,
            total_points: season_state.total_points,
            carry_over_yield_lamports: season_state.carry_over_yield_lamports,
            final_vault_pool_tokens: season_state.final_vault_pool_tokens,
        });

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let season_state = &mut ctx.accounts.season_state;
        let user_position = &mut ctx.accounts.user_position;

        require!(season_state.finalized, ErrorCode::SeasonNotFinalized);
        require!(!user_position.withdrawn, ErrorCode::AlreadyWithdrawn);
        require!(user_position.principal_lamports > 0, ErrorCode::NoPrincipal);

        let principal = user_position.principal_lamports;
        let yield_share = if season_state.total_points > 0 {
            ((season_state.final_total_yield_lamports as u128)
                .checked_mul(user_position.points as u128)
                .ok_or(ErrorCode::MathOverflow)?
                / (season_state.total_points as u128)) as u64
        } else {
            0
        };

        let payout_lamports = principal.checked_add(yield_share).ok_or(ErrorCode::MathOverflow)?;

        let payout_pool_tokens = lamports_to_pool_tokens_ceil(
            payout_lamports,
            season_state.final_total_assets_lamports,
            season_state.final_vault_pool_tokens,
        )?;

        require!(payout_pool_tokens > 0, ErrorCode::ZeroPayout);
        require!(ctx.accounts.vault_pool_token_ata.amount >= payout_pool_tokens, ErrorCode::InsufficientVaultPoolTokens);

        let season_key_bytes = season_state.key().to_bytes();
        let signer_seeds: &[&[u8]] = &[
            b"vault_authority",
            &season_key_bytes,
            &[season_state.vault_authority_bump],
        ];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_pool_token_ata.to_account_info(),
            to: ctx.accounts.user_pool_token_ata.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                &[signer_seeds],
            ),
            payout_pool_tokens,
        )?;

        user_position.withdrawn = true;

        emit!(Withdrawn {
            user: ctx.accounts.user.key(),
            principal_lamports: principal,
            yield_share_lamports: yield_share,
            payout_lamports,
            payout_pool_tokens,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeSeason<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + SeasonState::LEN,
        seeds = [b"season_state"],
        bump
    )]
    pub season_state: Account<'info, SeasonState>,

    #[account(
        seeds = [b"vault_authority", season_state.key().as_ref()],
        bump
    )]
    /// CHECK: PDA authority only used as token authority signer.
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = owner,
        associated_token::mint = pool_mint,
        associated_token::authority = vault_authority
    )]
    pub vault_pool_token_ata: Account<'info, TokenAccount>,

    /// CHECK: stake pool state account validated by client config and used later for finalize math.
    pub stake_pool: UncheckedAccount<'info>,

    /// CHECK: stake-pool program id used for CPI and validated against saved config.
    pub stake_pool_program: UncheckedAccount<'info>,

    pub pool_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProposeGameEngine<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"season_state"],
        bump = season_state.bump,
        has_one = owner
    )]
    pub season_state: Account<'info, SeasonState>,
}

#[derive(Accounts)]
pub struct AcceptGameEngine<'info> {
    pub proposed_game_engine: Signer<'info>,

    #[account(
        mut,
        seeds = [b"season_state"],
        bump = season_state.bump
    )]
    pub season_state: Account<'info, SeasonState>,
}

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"season_state"],
        bump = season_state.bump
    )]
    pub season_state: Account<'info, SeasonState>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserPosition::LEN,
        seeds = [b"user_position", season_state.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,

    #[account(mut, address = season_state.vault_pool_token_ata)]
    pub vault_pool_token_ata: Account<'info, TokenAccount>,

    /// CHECK: verified against season_state.stake_pool in handler.
    pub stake_pool: UncheckedAccount<'info>,

    /// CHECK: verified against season_state.stake_pool_program_id in handler.
    pub stake_pool_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AwardPoints<'info> {
    pub game_engine: Signer<'info>,

    #[account(
        mut,
        seeds = [b"season_state"],
        bump = season_state.bump,
        constraint = season_state.game_engine == game_engine.key() @ ErrorCode::UnauthorizedGameEngine
    )]
    pub season_state: Account<'info, SeasonState>,

    #[account(
        mut,
        seeds = [b"user_position", season_state.key().as_ref(), user_position.user.as_ref()],
        bump = user_position.bump
    )]
    pub user_position: Account<'info, UserPosition>,
}

#[derive(Accounts)]
pub struct Finalize<'info> {
    #[account(
        mut,
        seeds = [b"season_state"],
        bump = season_state.bump
    )]
    pub season_state: Account<'info, SeasonState>,

    #[account(mut, address = season_state.vault_pool_token_ata)]
    pub vault_pool_token_ata: Account<'info, TokenAccount>,

    /// CHECK: stake pool account, validated against season state key.
    pub stake_pool: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"season_state"],
        bump = season_state.bump
    )]
    pub season_state: Account<'info, SeasonState>,

    #[account(
        mut,
        seeds = [b"user_position", season_state.key().as_ref(), user.key().as_ref()],
        bump = user_position.bump,
        constraint = user_position.user == user.key() @ ErrorCode::InvalidUserPosition
    )]
    pub user_position: Account<'info, UserPosition>,

    #[account(
        seeds = [b"vault_authority", season_state.key().as_ref()],
        bump = season_state.vault_authority_bump
    )]
    /// CHECK: PDA signer for vault token transfer.
    pub vault_authority: UncheckedAccount<'info>,

    #[account(mut, address = season_state.vault_pool_token_ata)]
    pub vault_pool_token_ata: Account<'info, TokenAccount>,

    #[account(address = season_state.pool_mint)]
    pub pool_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = pool_mint,
        associated_token::authority = user
    )]
    pub user_pool_token_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct SeasonState {
    pub owner: Pubkey,
    pub game_engine: Pubkey,
    pub pending_game_engine: Pubkey,

    pub deposit_start: i64,
    pub deposit_end: i64,
    pub season_end: i64,

    pub total_principal_lamports: u64,
    pub total_points: u64,

    pub finalized: bool,
    pub final_total_assets_lamports: u64,
    pub final_total_yield_lamports: u64,
    pub final_vault_pool_tokens: u64,
    pub carry_over_yield_lamports: u64,

    pub stake_pool_program_id: Pubkey,
    pub stake_pool: Pubkey,
    pub pool_mint: Pubkey,
    pub vault_pool_token_ata: Pubkey,

    pub bump: u8,
    pub vault_authority_bump: u8,
}

impl SeasonState {
    pub const LEN: usize = (32 * 7)
    + (8 * 9)
        + 1
        + 2
        + 16;
}

#[account]
pub struct UserPosition {
    pub season: Pubkey,
    pub user: Pubkey,
    pub principal_lamports: u64,
    pub points: u64,
    pub withdrawn: bool,
    pub bump: u8,
}

impl UserPosition {
    pub const LEN: usize = (32 * 2) + (8 * 2) + 1 + 1 + 16;
}

#[event]
pub struct SeasonInitialized {
    pub owner: Pubkey,
    pub game_engine: Pubkey,
    pub deposit_start: i64,
    pub deposit_end: i64,
    pub season_end: i64,
    pub stake_pool_program_id: Pubkey,
    pub stake_pool: Pubkey,
    pub pool_mint: Pubkey,
    pub vault_pool_token_ata: Pubkey,
}

#[event]
pub struct Deposited {
    pub user: Pubkey,
    pub amount_lamports: u64,
    pub new_user_principal_lamports: u64,
    pub new_total_principal_lamports: u64,
    pub minted_pool_token_delta: u64,
}

#[event]
pub struct PointsAwarded {
    pub user: Pubkey,
    pub delta: u64,
    pub new_user_points: u64,
    pub new_total_points: u64,
}

#[event]
pub struct SeasonFinalized {
    pub final_total_assets_lamports: u64,
    pub total_principal_lamports: u64,
    pub final_total_yield_lamports: u64,
    pub total_points: u64,
    pub carry_over_yield_lamports: u64,
    pub final_vault_pool_tokens: u64,
}

#[event]
pub struct Withdrawn {
    pub user: Pubkey,
    pub principal_lamports: u64,
    pub yield_share_lamports: u64,
    pub payout_lamports: u64,
    pub payout_pool_tokens: u64,
}

#[event]
pub struct GameEngineProposed {
    pub current_game_engine: Pubkey,
    pub proposed_game_engine: Pubkey,
}

#[event]
pub struct GameEngineAccepted {
    pub previous_game_engine: Pubkey,
    pub new_game_engine: Pubkey,
}

fn read_stake_pool_state(stake_pool_info: &UncheckedAccount<'_>) -> Result<StakePool> {
    let data = stake_pool_info.try_borrow_data()?;
    StakePool::try_from_slice(&data).map_err(|_| error!(ErrorCode::InvalidStakePoolState))
}

fn pool_tokens_to_lamports_floor(pool_tokens: u64, stake_pool: &StakePool) -> Result<u64> {
    require!(stake_pool.pool_token_supply > 0, ErrorCode::InvalidExchangeRate);

    let numerator = (pool_tokens as u128)
        .checked_mul(stake_pool.total_lamports as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    Ok((numerator / stake_pool.pool_token_supply as u128) as u64)
}

fn lamports_to_pool_tokens_ceil(
    lamports: u64,
    final_total_assets_lamports: u64,
    final_vault_pool_tokens: u64,
) -> Result<u64> {
    if lamports == 0 {
        return Ok(0);
    }

    require!(final_total_assets_lamports > 0, ErrorCode::InvalidExchangeRate);
    require!(final_vault_pool_tokens > 0, ErrorCode::InvalidExchangeRate);

    let numerator = (lamports as u128)
        .checked_mul(final_vault_pool_tokens as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    let denominator = final_total_assets_lamports as u128;

    let quotient = numerator / denominator;
    let remainder = numerator % denominator;

    let rounded_up = if remainder > 0 { quotient + 1 } else { quotient };

    Ok(rounded_up as u64)
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid authority address")]
    InvalidAuthority,
    #[msg("Invalid time window")]
    InvalidTimeWindow,
    #[msg("Deposit window is closed")]
    DepositWindowClosed,
    #[msg("Points can only be awarded during active season")]
    PointsWindowClosed,
    #[msg("Season not yet ended")]
    SeasonNotEnded,
    #[msg("Season already finalized")]
    SeasonAlreadyFinalized,
    #[msg("Season not finalized")]
    SeasonNotFinalized,
    #[msg("User already withdrew")]
    AlreadyWithdrawn,
    #[msg("User has no principal")]
    NoPrincipal,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Unauthorized game engine")]
    UnauthorizedGameEngine,
    #[msg("Game engine changes are frozen once deposits open")]
    GameEngineFrozen,
    #[msg("No pending game engine proposal")]
    NoPendingGameEngine,
    #[msg("Only proposed game engine can accept")]
    UnauthorizedGameEngineAccept,
    #[msg("Invalid stake-pool program")]
    InvalidStakePoolProgram,
    #[msg("Invalid stake-pool account")]
    InvalidStakePoolAccount,
    #[msg("Invalid vault pool token account")]
    InvalidVaultPoolTokenAccount,
    #[msg("Stake-pool CPI did not increase vault pool token balance")]
    StakePoolCpiNoMint,
    #[msg("Invalid user position")]
    InvalidUserPosition,
    #[msg("Invalid stake-pool state")]
    InvalidStakePoolState,
    #[msg("Invalid exchange rate state")]
    InvalidExchangeRate,
    #[msg("Insufficient vault pool tokens")]
    InsufficientVaultPoolTokens,
    #[msg("Calculated payout is zero")]
    ZeroPayout,
}
