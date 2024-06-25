import { ethers, network } from "hardhat";

import { MockToken } from "../typechain-types";
import * as utils from "../utils";

const PATH = "addresses.json";
const AMOUNT = ethers.parseEther("10000000");
const TO = null;

async function main() {
    const [owner] = await ethers.getSigners();
    const chainId = network.config.chainId!;

    const addresses = await utils.load<utils.Addresses>(PATH);

    const USDT = await ethers.getContractFactory("Flash");
    const usdt = USDT.attach(addresses[chainId].USDT) as unknown as MockToken;

    await (await usdt.mint(TO ?? owner.address, AMOUNT)).wait();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
