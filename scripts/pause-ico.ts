import { ethers, network } from "hardhat";

import { FlashICO } from "../typechain-types";
import * as utils from "../utils";

const PATH = "addresses.json";
const PAUSE = false;

async function main() {
    // const [owner] = await ethers.getSigners();
    const chainId = network.config.chainId!;

    const addresses = await utils.load<utils.Addresses>(PATH);

    // Contracts
    const ICO = await ethers.getContractFactory("FlashICO");
    const ico = ICO.attach(addresses[chainId].ICO) as unknown as FlashICO;

    if (PAUSE) {
        await (await ico.pause()).wait();
    } else {
        await (await ico.unpause()).wait();
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
