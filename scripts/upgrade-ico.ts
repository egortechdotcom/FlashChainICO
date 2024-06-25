import { ethers, network, upgrades } from "hardhat";

import * as utils from "../utils";

const PATH = "addresses.json";

async function main() {
    const chainId = network.config.chainId!;

    const addresses = await utils.load<utils.Addresses>(PATH);

    const ICO = await ethers.getContractFactory("FlashICO");
    await upgrades.upgradeProxy(addresses[chainId].ICO, ICO);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
