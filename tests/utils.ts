import * as anchor from "@project-serum/anchor";
import { Provider } from "@project-serum/anchor";
import {
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MintLayout,
  createMintToInstruction,
} from "@solana/spl-token";

async function mintToAccount(provider, mint, destination, amount) {
  const tx = new anchor.web3.Transaction();
  tx.add(
    createMintToInstruction(
      mint,
      destination,
      provider.wallet.publicKey,
      amount
    )
  );
  await provider.sendAndConfirm(tx);
}

async function sendLamports(provider, destination, amount) {
  const tx = new anchor.web3.Transaction();
  tx.add(
    anchor.web3.SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      lamports: amount,
      toPubkey: destination,
    })
  );
  await provider.send(tx);
}

async function createMint(
  mintAccount,
  provider,
  mintAuthority,
  freezeAuthority,
  decimals,
  programId
) {
  const balanceNeeded = await getMinimumBalanceForRentExemptMint(
    provider.connection
  );

  const transaction = new anchor.web3.Transaction();
  transaction.add(
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.payer.publicKey,
      newAccountPubkey: mintAccount.publicKey,
      lamports: balanceNeeded,
      space: MintLayout.span,
      programId,
    })
  );

  transaction.add(
    createInitializeMintInstruction(
      mintAccount.publicKey,
      decimals,
      mintAuthority,
      freezeAuthority,
      programId
    )
  );

  await provider.sendAndConfirm(transaction, [mintAccount]);
  return mintAccount.publicKey;
  //return token.publicKey;
}

async function getTokenBalance(
  provider: Provider,
  pubKey: anchor.web3.PublicKey
) {
  return parseInt(
    (await provider.connection.getTokenAccountBalance(pubKey)).value.amount
  );
}

module.exports = {
  createMint,
  mintToAccount,
  sendLamports,
  getTokenBalance,
};
