pub mod constants;
pub mod contexts;
pub mod models;
pub mod utils;
pub mod validate;

use crate::contexts::*;
use crate::validate::*;
use crate::utils::*;
use crate::{constants::*};

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer, Token, MintTo};
use anchor_lang::solana_program::program::{invoke, invoke_signed};
use anchor_lang::solana_program::system_instruction::transfer;
use mpl_token_metadata::instruction::{create_master_edition_v3, create_metadata_accounts_v2};
use crate::models::{Config, ConfigLine};

declare_id!("76TQpMtLx1u3aZmwaQH7M5U3DnL3un22w6F3aw4dFcer");

#[program]
pub mod nft_minting {
    use super::*;

    pub fn setup(
        ctx: Context<Setup>,
        _nft_type: String,
        _nonce_config: u8,
        max_supply: u64,
        fee_point: u16,
        creator: Pubkey,
        prefix: String,
        token_name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        msg!("Set up");
        let config = &mut ctx.accounts.config;
        config.owner = ctx.accounts.owner.key();
        config.seller_fee_basis_points = fee_point;
        config.creator = creator;
        config.nft_type = _nft_type;
        config.supply = 1;
        config.max_supply = max_supply;
        config.prefix = prefix;
        config.token_name = token_name;
        config.symbol = symbol;
        config.uri = uri;
        config.nonce = _nonce_config;

        Ok(())
    }

    pub fn toggle_freeze_program(
        ctx: Context<ProgramFreeze>,
        _nft_type: String,
    ) -> Result<()> {
        msg!("Toggle Freeze Program");
        let config = &mut ctx.accounts.config;
        config.freeze_program = !config.freeze_program;

        Ok(())
    }

    pub fn init_token_account(
        _ctx: Context<InitTokenAccount>,
        _nft_type: String,
        _token_type: String,
    ) -> Result<()> {
        msg!("Init Set up TokenConfig");
        Ok(())
    }

    pub fn token_setup(
        ctx: Context<TokenSetUp>,
        _nft_type: String,
        _token_type: String,
        _nonce: u8,
        price: u64,
    ) -> Result<()> {
        msg!("Set up TokenConfig");
        let token_config = &mut ctx.accounts.token_config;

        token_config.owner = ctx.accounts.owner.key();
        token_config.nft_type = _nft_type;
        token_config.token_type = _token_type;
        token_config.token_mint = ctx.accounts.token_mint.key();
        token_config.token_vault = ctx.accounts.token_vault.key();
        token_config.nonce = _nonce;
        token_config.price = price;

        Ok(())
    }

    pub fn toggle_freeze_token(
        ctx: Context<TokenConfigContext>,
        _nft_type: String,
        _token_type: String,
    ) -> Result<()> {
        msg!("Toggle Freeze Token");
        let token_config = &mut ctx.accounts.token_config;
        token_config.freeze = !token_config.freeze;

        Ok(())
    }

    pub fn mint_price_update(
        ctx: Context<TokenConfigContext>,
        _nft_type: String,
        _token_type: String,
        price: u64,
    ) -> Result<()> {
        msg!("Update Mint Price");
        let token_config = &mut ctx.accounts.token_config;
        token_config.price = price;

        Ok(())
    }

    #[access_control(mint_available(& ctx.accounts))]
    pub fn mint_nft(
        ctx: Context<MintNFT>,
        _nft_type: String,
        _token_type: String,
    ) -> Result<()> {
        msg!("Mint NFT");
        let config = &mut ctx.accounts.config;
        let token_config = &mut ctx.accounts.token_config;

        //payment
        let is_native = ctx.accounts.token_mint.key() == spl_token::native_mint::id();
        if is_native {
            assert_keys_equal(ctx.accounts.owner.key(), ctx.accounts.owner_token_wallet.key())?;
            invoke(
                &transfer(
                    ctx.accounts.owner_token_wallet.to_account_info().key,
                    ctx.accounts.token_vault.to_account_info().key,
                    token_config.price,
                ),
                &[
                    ctx.accounts.owner.to_account_info(),
                    ctx.accounts.token_vault.to_account_info(),
                    ctx.accounts.system_program.to_account_info()
                ],
            )?;
        } else {
            let owner_token_mint = get_mint_from_token_account(&ctx.accounts.owner_token_wallet)?;
            let owner_token_owner = get_owner_from_token_account(&ctx.accounts.owner_token_wallet)?;

            assert_keys_equal(ctx.accounts.token_mint.key(), owner_token_mint)?;
            assert_keys_equal(ctx.accounts.owner.key(), owner_token_owner)?;

            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_accounts = Transfer {
                from: ctx.accounts.owner_token_wallet.to_account_info(),
                to: ctx.accounts.token_vault.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            };
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            token::transfer(cpi_ctx, token_config.price)?;
        }

        // start Mint
        msg!("Initializing Mint Ticket");
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.nft_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        msg!("CPI Accounts Assigned");
        let cpi_program = ctx.accounts.token_program.to_account_info();
        msg!("CPI Program Assigned");
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        msg!("CPI Context Assigned");
        token::mint_to(cpi_ctx, 1)?;
        msg!("Token Minted !!!");

        let creator = vec![
            // NFT art creator
            mpl_token_metadata::state::Creator {
                address: config.creator,
                verified: false,
                share: 100,
            },
            //NFT Collection
            mpl_token_metadata::state::Creator {
                address: config.owner,
                verified: true,
                share: 0,
            },
        ];
        msg!("Creator Assigned");

        let metadata_infos = vec![
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.owner.to_account_info(),
            ctx.accounts.owner.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ];
        msg!("Account Info Assigned");

        let master_edition_infos = vec![
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.owner.to_account_info(),
            ctx.accounts.owner.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ];
        msg!("Master Edition Account Infos Assigned");

        let config_line = get_config_line(&config)?;

        invoke(
            &create_metadata_accounts_v2(
                ctx.accounts.token_metadata_program.key(),
                ctx.accounts.metadata.key(),
                ctx.accounts.mint.key(),
                ctx.accounts.owner.key(),
                ctx.accounts.owner.key(),
                ctx.accounts.program_owner.key(),
                config_line.name,
                config.symbol.clone(),
                config_line.uri,
                Some(creator),
                config.seller_fee_basis_points,
                true,
                false,
                None,
                None,
            ),
            metadata_infos.as_slice(),
        )?;
        msg!("Metadata Account Created !!!");
        invoke(
            &create_master_edition_v3(
                ctx.accounts.token_metadata_program.key(),
                ctx.accounts.master_edition.key(),
                ctx.accounts.mint.key(),
                ctx.accounts.program_owner.key(),
                ctx.accounts.owner.key(),
                ctx.accounts.metadata.key(),
                ctx.accounts.owner.key(),
                Some(0),
            ),
            master_edition_infos.as_slice(),
        )?;
        msg!("Master Edition Nft Minted !!!");

        //update config
        config.supply += 1;

        Ok(())
    }

    pub fn mint_nft_old(
        ctx: Context<MintNFTOld>,
        _nft_type: String,
        _token_type: String,
        /*creator_key: Pubkey,
        uri: String,
        title: String,*/
    ) -> Result<()> {
        msg!("Initializing Mint Ticket");
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        msg!("CPI Accounts Assigned");
        let cpi_program = ctx.accounts.token_program.to_account_info();
        msg!("CPI Program Assigned");
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        msg!("CPI Context Assigned");
        token::mint_to(cpi_ctx, 1)?;
        msg!("Token Minted !!!");
        /*let account_info = vec![
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ];
        msg!("Account Info Assigned");
        let creator = vec![
            mpl_token_metadata::state::Creator {
                address: creator_key,
                verified: false,
                share: 100,
            },
            mpl_token_metadata::state::Creator {
                address: ctx.accounts.mint_authority.key(),
                verified: false,
                share: 0,
            },
        ];
        msg!("Creator Assigned");
        let symbol = std::string::ToString::to_string("symb");
        invoke(
            &create_metadata_accounts_v2(
                ctx.accounts.token_metadata_program.key(),
                ctx.accounts.metadata.key(),
                ctx.accounts.mint.key(),
                ctx.accounts.mint_authority.key(),
                ctx.accounts.payer.key(),
                ctx.accounts.payer.key(),
                title,
                symbol,
                uri,
                Some(creator),
                1,
                true,
                false,
                None,
                None,
            ),
            account_info.as_slice(),
        )?;
        msg!("Metadata Account Created !!!");
        let master_edition_infos = vec![
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ];
        msg!("Master Edition Account Infos Assigned");
        invoke(
            &create_master_edition_v3(
                ctx.accounts.token_metadata_program.key(),
                ctx.accounts.master_edition.key(),
                ctx.accounts.mint.key(),
                ctx.accounts.payer.key(),
                ctx.accounts.mint_authority.key(),
                ctx.accounts.metadata.key(),
                ctx.accounts.payer.key(),
                Some(0),
            ),
            master_edition_infos.as_slice(),
        )?;
        msg!("Master Edition Nft Minted !!!");*/

        Ok(())
    }
}

pub fn get_config_line(
    config: &Account<'_, Config>
) -> Result<ConfigLine> {
    Ok(ConfigLine {
        name: config.token_name.clone() + "#" + &(config.supply).to_string(),
        uri: config.uri.clone() + "/" + &config.prefix.clone() + &(config.supply).to_string(),
    })
}

#[error_code]
pub enum ErrorCode {
    #[msg("Permission Error, E1000")]
    PermissionError,
    #[msg("The contract frozen, E1001")]
    FreezeProgramError,
    #[msg("The token frozen, E1002")]
    FreezeTokenError,
    #[msg("Not enough SOL, E1003")]
    InsufficientSolAmountError,
    #[msg("Not enough Token, E1004")]
    InsufficientTokenAmountError,
    #[msg("Not enough Token, E1005")]
    MaxSupplyExceedError,
    #[msg("PublicKeyMismatch, E1006")]
    PublicKeyMismatch,
}
