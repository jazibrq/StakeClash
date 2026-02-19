import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

export function getProvider() {
  return anchor.AnchorProvider.env();
}

export function getProgram() {
  const provider = getProvider();
  anchor.setProvider(provider);
  // Replace with generated IDL import when available.
  const idl = require("../target/idl/season_vault.json");
  const programId = new PublicKey(idl.address);
  return new anchor.Program(idl, programId, provider);
}

export function seasonStatePda(programId: any) {
  return PublicKey.findProgramAddressSync([Buffer.from("season_state")], programId)[0];
}

export function vaultAuthorityPda(programId: any, seasonState: any) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault_authority"), seasonState.toBuffer()],
    programId
  )[0];
}

export function userPositionPda(programId: any, seasonState: any, user: any) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_position"), seasonState.toBuffer(), user.toBuffer()],
    programId
  )[0];
}

export function vaultPoolAta(vaultAuthority: any, poolMint: any) {
  return getAssociatedTokenAddressSync(poolMint, vaultAuthority, true);
}

export function bn(value: number | string | bigint) {
  return new anchor.BN(value.toString());
}

export async function airdrop(connection: any, user: any, sol = 2) {
  const sig = await connection.requestAirdrop(user, sol * anchor.web3.LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
}
