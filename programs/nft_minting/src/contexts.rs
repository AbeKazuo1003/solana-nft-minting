use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token, Mint};
use crate::{ErrorCode};
use crate::constants::*;
use crate::models::*;
use crate::utils::*;

#[derive(Accounts)]
#[instruction(_nft_type: String)]
pub struct Setup<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
    init,
    payer = owner,
    seeds = [
    CONFIG_PDA_SEED.as_ref(),
    name_seed(& _nft_type),
    ],
    bump,
    space = 8 + Config::LEN
    )]
    pub config: Box<Account<'info, Config>>,

    ///used by anchor for init of the token
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(_nft_type: String)]
pub struct ProgramFreeze<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
    seeds = [
    CONFIG_PDA_SEED.as_ref(),
    name_seed(& _nft_type),
    ],
    bump,
    constraint = config.owner == owner.key() @ ErrorCode::PermissionError
    )]
    pub config: Box<Account<'info, Config>>,
}

#[derive(Accounts)]
#[instruction(_nft_type: String, _token_type: String)]
pub struct InitTokenAccount<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
    seeds = [
    CONFIG_PDA_SEED.as_ref(),
    name_seed(& _nft_type),
    ],
    bump,
    constraint = config.owner == owner.key() @ ErrorCode::PermissionError,
    )]
    pub config: Box<Account<'info, Config>>,

    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
    init,
    payer = owner,
    token::mint = token_mint,
    token::authority = token_vault,
    seeds = [
    TOKEN_VAULT_PDA_SEED.as_ref(),
    name_seed(& _nft_type),
    name_seed(& _token_type),
    ],
    bump
    )]
    pub token_vault: Box<Account<'info, TokenAccount>>,

    ///used by anchor for init of the token
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(_nft_type: String, _token_type: String)]
pub struct TokenSetUp<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
    mut,
    constraint = config.owner == owner.key() @ ErrorCode::PermissionError,
    seeds = [
    CONFIG_PDA_SEED.as_ref(),
    name_seed(& _nft_type),
    ],
    bump = config.nonce,
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(
    init,
    payer = owner,
    seeds = [
    TOKEN_CONFIG_PDA_SEED.as_ref(),
    name_seed(& _nft_type),
    name_seed(& _token_type),
    ],
    bump,
    space = 8 + TokenConfig::LEN
    )]
    pub token_config: Box<Account<'info, TokenConfig>>,

    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
    mut,
    seeds = [
    TOKEN_VAULT_PDA_SEED.as_ref(),
    name_seed(& _nft_type),
    name_seed(& _token_type),
    ],
    bump
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_vault: UncheckedAccount<'info>,

    ///used by anchor for init of the token
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(_nft_type: String, _token_type: String)]
pub struct TokenConfigContext<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
    mut,
    seeds = [
    TOKEN_CONFIG_PDA_SEED.as_ref(),
    name_seed(& _nft_type),
    name_seed(& _token_type),
    ],
    bump,
    constraint = token_config.owner == owner.key() @ ErrorCode::PermissionError
    )]
    pub token_config: Box<Account<'info, TokenConfig>>,
}

#[derive(Accounts)]
#[instruction(_nft_type: String, _token_type: String)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
    mut,
    seeds = [
    CONFIG_PDA_SEED.as_ref(),
    name_seed(& _nft_type),
    ],
    bump = config.nonce,
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(
    mut,
    seeds = [
    TOKEN_CONFIG_PDA_SEED.as_ref(),
    name_seed(& _nft_type),
    name_seed(& _token_type),
    ],
    bump,
    )]
    pub token_config: Box<Account<'info, TokenConfig>>,

    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
    mut,
    seeds = [
    TOKEN_VAULT_PDA_SEED.as_ref(),
    name_seed(& _nft_type),
    name_seed(& _token_type),
    ],
    bump
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_vault: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub owner_token_wallet: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub mint: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub nft_account: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub metadata: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub master_edition: UncheckedAccount<'info>,

    ///used by anchor for init of the token
    #[account(address = mpl_token_metadata::id())]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}