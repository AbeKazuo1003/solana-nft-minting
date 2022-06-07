use anchor_lang::prelude::*;

use arrayref::array_ref;

use crate::constants::*;
use crate::{ErrorCode};

pub fn name_seed(name: &str) -> &[u8] {
    let b = name.as_bytes();
    if b.len() > NAME_MAX_LEN {
        &b[0..NAME_MAX_LEN]
    } else {
        b
    }
}

pub fn assert_keys_equal(key1: Pubkey, key2: Pubkey) -> Result<()> {
    if key1 != key2 {
        return err!(ErrorCode::PublicKeyMismatch);
    } else {
        Ok(())
    }
}

pub fn get_mint_from_token_account(
    token_account_info: &AccountInfo,
) -> Result<Pubkey> {
    // TokenAccount layout:   mint(32), owner(32), ...
    let data = token_account_info.try_borrow_data()?;
    let mint_data = array_ref![data, 0, 32];
    Ok(Pubkey::new_from_array(*mint_data))
}

pub fn get_owner_from_token_account(
    token_account_info: &AccountInfo,
) -> Result<Pubkey> {
    // TokenAccount layout:   mint(32), owner(32), ...
    let data = token_account_info.try_borrow_data()?;
    let owner_data = array_ref![data, 32, 32];
    Ok(Pubkey::new_from_array(*owner_data))
}