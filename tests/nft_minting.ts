import * as anchor from "@project-serum/anchor";
import { Program, Wallet } from "@project-serum/anchor";
import { NftMinting } from "../target/types/nft_minting";
import {
  createAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const utils = require("./utils");
import * as fs from "fs";
import * as assert from "assert";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.NftMinting as Program<NftMinting>;
const wallet = provider.wallet as Wallet;
const KEY_PATH =
  "/home/alex/blockchain/cgc-solana-contracts/nft_minting/tests/keys/";

const CONFIG_PDA_SEED = "config";
const TOKEN_CONFIG_PDA_SEED = "token_config";
const TOKEN_VAULT_PDA_SEED = "token_vault";

describe("nft_minting", () => {
  const sol_mode: boolean = true;
  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );
  let usdcMintKeyPair: anchor.web3.Keypair;
  let usdcMintPubkey: anchor.web3.PublicKey;

  let user: anchor.web3.Keypair;
  let user_usdcWallet: anchor.web3.PublicKey;

  it("Prepare", async () => {
    //Load USDC
    let usdcKeyPairFile = fs.readFileSync(KEY_PATH + "usdc.json", "utf-8");
    let usdcKeyPairData = JSON.parse(usdcKeyPairFile);
    usdcMintKeyPair = anchor.web3.Keypair.fromSecretKey(
      new Uint8Array(usdcKeyPairData)
    );
    usdcMintPubkey = await utils.createMint(
      usdcMintKeyPair,
      provider,
      wallet.publicKey,
      null,
      9,
      TOKEN_PROGRAM_ID
    );

    // Load User
    let userPairFile = fs.readFileSync(KEY_PATH + "user_A.json", "utf-8");
    let userPairData = JSON.parse(userPairFile);
    user = anchor.web3.Keypair.fromSecretKey(new Uint8Array(userPairData));

    // Airdrop 10 SOL to user
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user.publicKey, 1_000_000_000),
      "confirmed"
    );

    user_usdcWallet = await createAssociatedTokenAccount(
      provider.connection,
      // @ts-ignore
      provider.wallet.payer,
      usdcMintPubkey,
      user.publicKey
    );
    console.log(user_usdcWallet.toString());
    //Mint USDC to user
    await utils.mintToAccount(
      provider,
      usdcMintPubkey,
      user_usdcWallet,
      1000_000_000_000
    ); //1000 USDC
    assert.strictEqual(
      await utils.getTokenBalance(provider, user_usdcWallet),
      1000_000_000_000
    );
  });
  if (sol_mode) {
    let nft_mint_first = "solchick_item";
    let token_type = "sol";
    let config: anchor.web3.PublicKey;
    let config_bump: number;

    let solana_token_config: anchor.web3.PublicKey;
    let solana_token_config_bump: number;

    let solana_vault: anchor.web3.PublicKey;
    let solana_vault_bump: number;

    let tokenMint: anchor.web3.PublicKey = new anchor.web3.PublicKey(
      "So11111111111111111111111111111111111111112"
    );

    it("1-1. Prepare(SOL)", async () => {
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
          "https://ipfs.io/ipfs/QmXKTezYwsLJY2dQ7HHEpi93g8A74gdve8HRNGEkFVftdD"
        )
        .accounts({
          owner: wallet.publicKey,
          config: config,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      const config_fetch = await program.account.config.fetch(config);
      console.log(config_fetch);
    });
    it("1-2. Token Setup (SOL)", async () => {
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
          config: config,
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
    });
    it("1-3 Mint NFT (SOL)", async () => {
      const lamports: number =
        await provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
      const getMetadata = async (
        mint: anchor.web3.PublicKey
      ): Promise<anchor.web3.PublicKey> => {
        return (
          await anchor.web3.PublicKey.findProgramAddress(
            [
              Buffer.from("metadata"),
              TOKEN_METADATA_PROGRAM_ID.toBuffer(),
              mint.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
          )
        )[0];
      };

      const getMasterEdition = async (
        mint: anchor.web3.PublicKey
      ): Promise<anchor.web3.PublicKey> => {
        return (
          await anchor.web3.PublicKey.findProgramAddress(
            [
              Buffer.from("metadata"),
              TOKEN_METADATA_PROGRAM_ID.toBuffer(),
              mint.toBuffer(),
              Buffer.from("edition"),
            ],
            TOKEN_METADATA_PROGRAM_ID
          )
        )[0];
      };
      const mintKey: anchor.web3.Keypair = anchor.web3.Keypair.generate();
      const userNFTAccount = await getAssociatedTokenAddress(
        mintKey.publicKey,
        user.publicKey
      );
      console.log("NFT Account: ", userNFTAccount.toBase58());

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
      console.log(
        await provider.connection.getParsedAccountInfo(mintKey.publicKey)
      );

      console.log("Account: ", res);
      console.log("Mint key: ", mintKey.publicKey.toString());
      console.log("User: ", user.publicKey.toString());

      const metadataAddress = await getMetadata(mintKey.publicKey);
      const masterEdition = await getMasterEdition(mintKey.publicKey);

      console.log("Metadata address: ", metadataAddress.toBase58());
      console.log("MasterEdition: ", masterEdition.toBase58());

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
          metadata: metadataAddress,
          masterEdition: masterEdition,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();
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
    });
  } else {
    let nft_mint_second = "solchick_weapon";
    let token_type = "usdc";
    let config: anchor.web3.PublicKey;
    let config_bump: number;

    let usdc_token_config: anchor.web3.PublicKey;
    let usdc_token_config_bump: number;

    let usdc_vault: anchor.web3.PublicKey;
    let usdc_vault_bump: number;

    let tokenMint: anchor.web3.PublicKey;

    it("2-1. Prepare (USDC)", async () => {
      [config, config_bump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(CONFIG_PDA_SEED), Buffer.from(nft_mint_second)],
        program.programId
      );
      await program.methods
        .setup(
          nft_mint_second,
          config_bump,
          new anchor.BN(10),
          5,
          wallet.publicKey,
          "solchick_nft_",
          "SOLCHICK_NFT",
          "SOLITEM",
          "https://ipfs.io/ipfs/QmXKTezYwsLJY2dQ7HHEpi93g8A74gdve8HRNGEkFVftdD"
        )
        .accounts({
          owner: wallet.publicKey,
          config: config,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      const config_fetch = await program.account.config.fetch(config);
      console.log(config_fetch);
    });
    it("2-2. Token Setup (USDC)", async () => {
      tokenMint = usdcMintPubkey;
      const mint_price = new anchor.BN(10_000_000_000); // 10 USDC
      [usdc_token_config, usdc_token_config_bump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(TOKEN_CONFIG_PDA_SEED),
            Buffer.from(nft_mint_second),
            Buffer.from(token_type),
          ],
          program.programId
        );
      [usdc_vault, usdc_vault_bump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(TOKEN_VAULT_PDA_SEED),
            Buffer.from(nft_mint_second),
            Buffer.from(token_type),
          ],
          program.programId
        );
      await program.methods
        .initTokenAccount(nft_mint_second, token_type)
        .accounts({
          owner: wallet.publicKey,
          config: config,
          tokenMint: tokenMint,
          tokenVault: usdc_vault,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      await program.methods
        .tokenSetup(
          nft_mint_second,
          token_type,
          usdc_token_config_bump,
          mint_price
        )
        .accounts({
          owner: wallet.publicKey,
          config: config,
          tokenMint: tokenMint,
          tokenVault: usdc_vault,
          tokenConfig: usdc_token_config,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      const token_config_fetch = await program.account.tokenConfig.fetch(
        usdc_token_config
      );
      console.log(token_config_fetch);
    });
    it("2-3. Mint NFT (USDC)", async () => {
      await program.methods
        .mintNft(nft_mint_second, token_type)
        .accounts({
          owner: user.publicKey,
          config: config,
          tokenConfig: usdc_token_config,
          tokenVault: usdc_vault,
          tokenMint: tokenMint,
          ownerTokenWallet: user_usdcWallet,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();
      console.log(
        "User USDC: ",
        await utils.getTokenBalance(provider, user_usdcWallet)
      );
      console.log(
        "USDC Vault Balance: ",
        await utils.getTokenBalance(provider, usdc_vault)
      );
    });
  }

  /*it("Is initialized!", async () => {



            const mintKey: anchor.web3.Keypair = anchor.web3.Keypair.generate();
            const NftTokenAccount = await getAssociatedTokenAddress(
                mintKey.publicKey,
                wallet.publicKey
            );

            console.log("NFT Account: ", NftTokenAccount.toBase58());

            const mint_tx = new anchor.web3.Transaction().add(
                anchor.web3.SystemProgram.createAccount({
                    fromPubkey: wallet.publicKey,
                    newAccountPubkey: mintKey.publicKey,
                    space: MINT_SIZE,
                    programId: TOKEN_PROGRAM_ID,
                    lamports,
                }),
                createInitializeMintInstruction(
                    mintKey.publicKey,
                    0,
                    wallet.publicKey,
                    wallet.publicKey
                ),
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    NftTokenAccount,
                    wallet.publicKey,
                    mintKey.publicKey
                )
            );

            const res = await provider.sendAndConfirm(mint_tx, [mintKey]);
            console.log(
                await provider.connection.getParsedAccountInfo(mintKey.publicKey)
            );

            console.log("Account: ", res);
            console.log("Mint key: ", mintKey.publicKey.toString());
            console.log("User: ", wallet.publicKey.toString());

            const metadataAddress = await getMetadata(mintKey.publicKey);
            const masterEdition = await getMasterEdition(mintKey.publicKey);

            console.log("Metadata address: ", metadataAddress.toBase58());
            console.log("MasterEdition: ", masterEdition.toBase58());

            const tx = await program.methods
                .mintNft(
                    mintKey.publicKey,
                    "https://arweave.net/y5e5DJsiwH0s_ayfMwYk-SnrZtVZzHLQDSTZ5dNRUHA",
                    "NFT Title",
                )
                .accounts({
                    mintAuthority: wallet.publicKey,
                    masterEdition: masterEdition,
                    mint: mintKey.publicKey,
                    tokenAccount: NftTokenAccount,
                    metadata: metadataAddress,
                    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                    payer: wallet.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                }).rpc();
            console.log("Your transaction signature", tx);
        });*/
});
