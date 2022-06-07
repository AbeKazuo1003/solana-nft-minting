use anchor_lang::prelude::*;
use crate::{NAME_MAX_LEN, URI_PREFIX};

#[account]
#[derive(Default)]
pub struct Config {
    pub owner: Pubkey,
    pub seller_fee_basis_points: u16,
    pub creator: Pubkey,
    pub nft_type: String,
    pub supply: u64,
    pub max_supply: u64,
    pub uri: String,
    //max length 300
    pub prefix: String,
    //max length 20
    pub token_name: String,
    //max length 20
    pub symbol: String,
    //max length 20
    pub freeze_program: bool,
    pub nonce: u8,
}

impl Config {
    pub const LEN: usize = 32 + NAME_MAX_LEN + 8 + 8 + URI_PREFIX + NAME_MAX_LEN + NAME_MAX_LEN + NAME_MAX_LEN + 1 + 1 + 2 + 32;
}

#[account]
#[derive(Default)]
pub struct TokenConfig {
    pub owner: Pubkey,
    pub token_type: String,
    pub nft_type: String,
    pub token_mint: Pubkey,
    pub token_vault: Pubkey,
    pub price: u64,
    pub freeze: bool,
    pub nonce: u8,
}

impl TokenConfig {
    pub const LEN: usize = 32 + 1 + 32 + 32 + 8 + 1 + 1 + NAME_MAX_LEN + NAME_MAX_LEN;
}

/// Individual config line for storing NFT data pre-mint.
#[derive(AnchorSerialize, AnchorDeserialize, Debug)]
pub struct ConfigLine {
    pub name: String,
    /// URI pointing to JSON representing the asset
    pub uri: String,
}
