import { ethers, network } from "hardhat";

import { Flash } from "../typechain-types";
import * as utils from "../utils";

const PATH = "addresses.json";
const AMOUNT = ethers.parseEther("10000000");
const TO = null;

async function main() {
    const [owner] = await ethers.getSigners();
    const chainId = network.config.chainId!;

    const addresses = await utils.load<utils.Addresses>(PATH);

    const Flash = await ethers.getContractFactory("Flash");
    const flash = Flash.attach(addresses[chainId].Flash) as unknown as Flash;

    await (await flash.mint(TO ?? owner.address, AMOUNT)).wait();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
