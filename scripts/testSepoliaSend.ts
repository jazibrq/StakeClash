import dotenv from "dotenv";
dotenv.config({ path: "./stakeclash-vault/.env" });

import { sendEth } from "../src/eth.ts";

const TO = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

const hash = await sendEth(TO, 1_000_000_000_000_000n); // 0.001 ETH
console.log("done:", hash);
