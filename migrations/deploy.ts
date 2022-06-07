// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import { Program, Wallet } from "@project-serum/anchor";

const anchor = require("@project-serum/anchor");
import { NftMinting } from "../target/types/nft_minting";
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";
const utils = require("../tests/utils");

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);
  // Add your deploy script here.
  let program = anchor.workspace.NftMinting as Program<NftMinting>;
  const wallet = provider.wallet as Wallet;
  console.log("Program: ", program.programId.toString());
  console.log("Deployer: ", wallet.publicKey.toString());
  const CONFIG_PDA_SEED = "config";
  const TOKEN_CONFIG_PDA_SEED = "token_config";
  const TOKEN_VAULT_PDA_SEED = "token_vault";
  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  let setup: boolean = false;
  let token_setup: boolean = false;
  let mint_action_initialize: boolean = false;
  let mint_action: boolean = true;

  if (setup) {
    let nft_mint_first = "solchick_item";
    let token_type = "sol";

    let config;
    let config_bump: number;

    [config, config_bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(CONFIG_PDA_SEED), Buffer.from(nft_mint_first)],
      program.programId
    );

    await program.methods
      .setup(
        nft_mint_first,
        config_bump,
        new anchor.BN(10),
        5,
        wallet.publicKey,
        "solchick_nft_",
        "SOLCHICK_NFT",
        "SOLITEM",
        "https://ipfs.io/ipfs/QmYngTAwCUsca9ZidZLykH5RgQ4DWK6mJB1CUV9a4v7D3n"
      )
      .accounts({
        owner: wallet.publicKey,
        config: config,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([provider.wallet.payer])
      .rpc();
    const config_fetch = await program.account.config.fetch(config);
    console.log(config_fetch);
  }

  if (token_setup) {
    let nft_mint_first = "solchick_item";
    let token_type = "sol";

    let solana_token_config;
    let solana_token_config_bump: number;

    let solana_vault;
    let solana_vault_bump: number;

    let tokenMint = new anchor.web3.PublicKey(
      "So11111111111111111111111111111111111111112"
    );

    const mint_price = new anchor.BN(100_000_000); // 0.1 SOL
    [solana_token_config, solana_token_config_bump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(TOKEN_CONFIG_PDA_SEED),
          Buffer.from(nft_mint_first),
          Buffer.from(token_type),
        ],
        program.programId
      );
    [solana_vault, solana_vault_bump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(TOKEN_VAULT_PDA_SEED),
          Buffer.from(nft_mint_first),
          Buffer.from(token_type),
        ],
        program.programId
      );
    await program.methods
      .tokenSetup(
        nft_mint_first,
        token_type,
        solana_token_config_bump,
        mint_price
      )
      .accounts({
        owner: wallet.publicKey,
        config: new anchor.web3.PublicKey(
          "7UMoiT91u9GGqVje2roa9C3F6zj1m68uuGQuJ58Sg334"
        ),
        tokenMint: tokenMint,
        tokenVault: solana_vault,
        tokenConfig: solana_token_config,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    const token_config_fetch = await program.account.tokenConfig.fetch(
      solana_token_config
    );
    console.log(token_config_fetch);
  }
  if (mint_action_initialize) {
    let nft_mint_first = "solchick_item";
    let token_type = "sol";
  }

  if (mint_action) {
    let nft_mint_first = "solchick_item";
    let token_type = "sol";

    let private_key = bs58.decode(
      "X798kdSiXqSB6n8v5jfexXZwaTYucXcLgDvaUtcWvxSAg92Pinn2XXCvhSxDQeSCvrG2yXxCAHSGdm9dTZwiHQf"
    );
    let user = anchor.web3.Keypair.fromSecretKey(private_key);

    const mintSecretKey = [
      249, 17, 73, 24, 192, 227, 80, 162, 95, 36, 196, 141, 201, 231, 216, 169,
      163, 201, 145, 189, 47, 154, 97, 181, 235, 18, 35, 51, 184, 21, 52, 191,
      94, 147, 225, 218, 223, 241, 8, 116, 122, 50, 42, 11, 253, 230, 70, 249,
      118, 227, 31, 208, 89, 229, 241, 42, 39, 85, 213, 199, 179, 170, 35, 118,
    ];

    const mintKey = anchor.web3.Keypair.fromSecretKey(
      Uint8Array.from(mintSecretKey)
    );

    const userNFTAccount = await getAssociatedTokenAddress(
      mintKey.publicKey,
      user.publicKey
    );
    const config = new anchor.web3.PublicKey(
      "7UMoiT91u9GGqVje2roa9C3F6zj1m68uuGQuJ58Sg334"
    );
    const solana_token_config = new anchor.web3.PublicKey(
      "DeoXeWQ4iZNfPcyRGjXhrNdF8EPvGbMGeqfAnfbPuTEo"
    );
    const solana_vault = new anchor.web3.PublicKey(
      "GWk63AsTuGej2KZ5Q7k5AaZ75EDHxrE2T3GXwpDqX4oC"
    );

    let tokenMint = new anchor.web3.PublicKey(
      "So11111111111111111111111111111111111111112"
    );
    console.log("User:", user.publicKey.toString());
    console.log(
      "User SOL: ",
      await provider.connection.getBalance(user.publicKey)
    );
    console.log("Mint Pubkey: ", mintKey.publicKey.toString());
    console.log("User NFT Account: ", userNFTAccount.toString());

    /*let lamports = await provider.connection.getMinimumBalanceForRentExemption(
      MINT_SIZE
    );
    const mint_tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: user.publicKey,
        newAccountPubkey: mintKey.publicKey,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID,
        lamports,
      }),
      createInitializeMintInstruction(
        mintKey.publicKey,
        0,
        user.publicKey,
        user.publicKey
      ),
      createAssociatedTokenAccountInstruction(
        user.publicKey,
        userNFTAccount,
        user.publicKey,
        mintKey.publicKey
      )
    );
    const res = await provider.sendAndConfirm(mint_tx, [mintKey, user]);
    console.log("Tx: ", res);*/

    let metadataAddress = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKey.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    let masterEdition = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKey.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    console.log("Metadata address: ", metadataAddress[0].toBase58());
    console.log("MasterEdition: ", masterEdition[0].toBase58());

    try {
      await program.methods
        .mintNft(nft_mint_first, token_type)
        .accounts({
          owner: user.publicKey,
          config: config,
          tokenConfig: solana_token_config,
          tokenVault: solana_vault,
          tokenMint: tokenMint,
          ownerTokenWallet: user.publicKey,
          mint: mintKey.publicKey,
          nftAccount: userNFTAccount,
          metadata: metadataAddress[0],
          masterEdition: masterEdition[0],
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();
    } catch (error) {
      console.log(error);
    }
    console.log(
      "Service Fee: ",
      await provider.connection.getBalance(solana_vault)
    );
    console.log(
      "User SOL: ",
      await provider.connection.getBalance(user.publicKey)
    );
    console.log(
      "User NFT: ",
      await utils.getTokenBalance(provider, userNFTAccount)
    );
  }
};
