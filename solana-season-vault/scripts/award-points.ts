import { PublicKey } from "@solana/web3.js";
import { getProgram, getProvider, seasonStatePda, userPositionPda, bn } from "./common";

async function main() {
  const program = getProgram();
  const provider = getProvider();

  const user = new PublicKey(process.env.USER!);
  const delta = BigInt(process.env.DELTA_POINTS ?? "100");

  const seasonState = seasonStatePda(program.programId);
  const userPosition = userPositionPda(program.programId, seasonState, user);

  const tx = await program.methods
    .awardPoints(bn(delta))
    .accounts({
      gameEngine: provider.wallet.publicKey,
      seasonState,
      userPosition,
    })
    .rpc();

  console.log("award points tx:", tx);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
