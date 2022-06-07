use anchor_lang::prelude::*;
use crate::{MintNFT, ErrorCode};

pub fn mint_available(accounts: &MintNFT) -> Result<()> {
    if accounts.config.freeze_program {
        return err!(ErrorCode::FreezeProgramError);
    }

    if accounts.token_config.freeze {
        return err!(ErrorCode::FreezeTokenError);
    }

    if accounts.config.supply + 1 > accounts.config.max_supply {
        return err!(ErrorCode::MaxSupplyExceedError);
    }
    Ok(())
}